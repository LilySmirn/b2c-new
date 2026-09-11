import { v4 as uuidv4 } from "uuid";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/app/lib/db";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";

export type FinalPaymentStatus = "succeeded" | "canceled";

export type ProcessPaymentStatusInput = {
    paymentId: string;
    status: FinalPaymentStatus;
    cancellationReason?: string | null;
    cancellationParty?: string | null;
};

export type ProcessPaymentStatusResult = {
    paymentId: string;
    status: FinalPaymentStatus;
    cancellationReason: string | null;
    subscriptionChanged: boolean;
    alreadyProcessed: boolean;
};

type PaymentRow = RowDataPacket & {
    payment_id: string;
    user_id: string;
    tariff_id: string;
    status: string;
};

type TariffRow = RowDataPacket & {
    duration: number;
};

type SubscriptionRow = RowDataPacket & {
    id: string;
};

async function verifyCommittedPaymentStatus(
    paymentId: string,
    expectedStatus: FinalPaymentStatus,
): Promise<void> {
    // Deliberately use the pool rather than trx: this read must happen on a
    // different checkout, after commit, so it verifies what other requests see.
    const [rows] = await pool.query<PaymentRow[]>(
        `SELECT payment_id, status
         FROM payments
         WHERE payment_id = ?
         LIMIT 1`,
        [paymentId],
    );
    const finalStatus = rows[0]?.status ?? null;

    await logPaymentEvent("payment_status_after_commit", paymentId, {
        expectedStatus,
        finalStatus,
    });

    if (finalStatus !== expectedStatus) {
        throw new Error(
            `Payment ${paymentId} has status ${String(finalStatus)} after commit; expected ${expectedStatus}`,
        );
    }
}

/**
 * Applies a final provider status and, on the first succeeded transition only,
 * grants the tariff. Payment and subscription changes are one transaction.
 */
export async function processPaymentStatus(
    input: ProcessPaymentStatusInput,
): Promise<ProcessPaymentStatusResult | null> {

    const trx = await pool.getConnection();
    let transactionOpen = false;

    try {
        await trx.beginTransaction();
        transactionOpen = true;

        // Read only the ownership key first, then use the user as a stable mutex.
        // This also serializes two different successful payments for one user.
        const [ownershipRows] = await trx.query<PaymentRow[]>(
            `SELECT payment_id, user_id, tariff_id, status
             FROM payments
             WHERE payment_id = ?
             LIMIT 1`,
            [input.paymentId],
        );
        const ownership = ownershipRows[0];

        if (!ownership) {
            await trx.rollback();
            transactionOpen = false;
            return null;
        }

        await trx.query(
            `SELECT user_id FROM users WHERE user_id = ? FOR UPDATE`,
            [ownership.user_id],
        );

        const [paymentRows] = await trx.query<PaymentRow[]>(
            `SELECT payment_id, user_id, tariff_id, status
             FROM payments
             WHERE payment_id = ?
             LIMIT 1
             FOR UPDATE`,
            [input.paymentId],
        );
        const payment = paymentRows[0];

        if (!payment) {
            await trx.rollback();
            transactionOpen = false;
            return null;
        }

        // Both YooKassa final states are immutable.
        if (payment.status === "succeeded" || payment.status === "canceled") {
            await trx.commit();
            transactionOpen = false;
            await verifyCommittedPaymentStatus(input.paymentId, payment.status);
            return {
                paymentId: String(payment.payment_id),
                status: payment.status,
                cancellationReason: null,
                subscriptionChanged: false,
                alreadyProcessed: true,
            };
        }

        if (input.status === "canceled") {
            const [updateResult] = await trx.execute<ResultSetHeader>(
                `UPDATE payments
                 SET status = 'canceled',
                     paid_at = NULL,
                     updated_at = UTC_TIMESTAMP(),
                     canceled_at = UTC_TIMESTAMP(),
                     cancellation_reason = ?,
                     cancellation_party = ?
                 WHERE payment_id = ?
                   AND status NOT IN ('succeeded', 'canceled')`,
                [input.cancellationReason, input.cancellationParty ?? null, input.paymentId],
            );
            if (updateResult.affectedRows !== 1) {
                throw new Error(
                    `Canceled transition updated ${updateResult.affectedRows} payment rows for ${input.paymentId}`,
                );
            }
            await trx.commit();
            transactionOpen = false;
            await verifyCommittedPaymentStatus(input.paymentId, "canceled");
            return {
                paymentId: input.paymentId,
                status: "canceled",
                cancellationReason: input.cancellationReason ?? null,
                subscriptionChanged: false,
                alreadyProcessed: payment.status === "canceled",
            };
        }

        const [tariffRows] = await trx.query<TariffRow[]>(
            `SELECT duration
             FROM tariffs
             WHERE tariff_id = ?
             LIMIT 1`,
            [payment.tariff_id],
        );
        const tariff = tariffRows[0];
        if (!tariff || !Number.isInteger(Number(tariff.duration)) || Number(tariff.duration) <= 0) {
            throw new Error(`Payment ${input.paymentId} references a tariff with invalid duration`);
        }

        const [subscriptionRows] = await trx.query<SubscriptionRow[]>(
            `SELECT id
             FROM subscriptions
             WHERE user_id = ?
               AND expiration_date > CURRENT_DATE()
             ORDER BY expiration_date DESC
             LIMIT 1
             FOR UPDATE`,
            [payment.user_id],
        );
        const subscription = subscriptionRows[0];

        if (subscription) {
            await trx.execute(
                `UPDATE subscriptions
                 SET expiration_date = DATE_ADD(expiration_date, INTERVAL ? MONTH),
                     last_paid_tariff_id = ?
                 WHERE id = ?`,
                [Number(tariff.duration), payment.tariff_id, subscription.id],
            );
        } else {
            await trx.execute(
                `INSERT INTO subscriptions (
                    id, user_id, last_paid_tariff_id, start_date,
                    expiration_date, is_auto_renewal
                 ) VALUES (
                    ?, ?, ?, UTC_TIMESTAMP(),
                    DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MONTH), 1
                 )`,
                [uuidv4(), payment.user_id, payment.tariff_id, Number(tariff.duration)],
            );
        }

        const [updateResult] = await trx.execute<ResultSetHeader>(
            `UPDATE payments
             SET status = 'succeeded',
                 paid_at = UTC_TIMESTAMP(),
                 updated_at = UTC_TIMESTAMP(),
                 canceled_at = NULL,
                 cancellation_reason = NULL,
                 cancellation_party = NULL
             WHERE payment_id = ?
               AND status IN ('creating', 'pending')`,
            [input.paymentId],
        );
        if (updateResult.affectedRows !== 1) {
            throw new Error(
                `Succeeded transition updated ${updateResult.affectedRows} payment rows for ${input.paymentId}`,
            );
        }

        await trx.commit();
        transactionOpen = false;
        await verifyCommittedPaymentStatus(input.paymentId, "succeeded");
        return {
            paymentId: input.paymentId,
            status: "succeeded",
            cancellationReason: null,
            subscriptionChanged: true,
            alreadyProcessed: false,
        };
    } catch (error) {
        if (transactionOpen) {
            await trx.rollback();
        }
        throw error;
    } finally {
        trx.release();
    }
}