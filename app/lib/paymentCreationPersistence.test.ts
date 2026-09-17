import assert from "node:assert/strict";
import test from "node:test";
import type { FieldPacket, QueryResult, RowDataPacket } from "mysql2/promise";
import { persistCreatedYookassaPayment } from "./db";

type LocalStatus = "creating" | "pending" | "succeeded" | "canceled";

function paymentExecutor(initialStatus: LocalStatus) {
    let status: LocalStatus = initialStatus;
    let yookassaPaymentId: string | null = null;
    const queries: string[] = [];

    return {
        executor: {
            async query<T extends QueryResult>(sql: string, params?: unknown[]): Promise<[T, FieldPacket[]]> {
                queries.push(sql);
                if (sql.startsWith("UPDATE")) {
                    const transitioned = status === "creating";
                    if (status === "creating") {
                        yookassaPaymentId = String(params?.[0]);
                        status = "pending";
                    }
                    return [{ affectedRows: transitioned ? 1 : 0 } as T, []];
                }
                return [[{ status }] as unknown as T, []];
            },
        },
        snapshot: () => ({ status, yookassaPaymentId, queries }),
    };
}

test("successful YooKassa creation atomically saves its id and moves creating to pending", async () => {
    const fake = paymentExecutor("creating");

    const localStatus = await persistCreatedYookassaPayment("local-1", "yk-1", fake.executor);

    assert.equal(localStatus, "pending");
    assert.deepEqual(fake.snapshot(), {
        status: "pending",
        yookassaPaymentId: "yk-1",
        queries: [
            `UPDATE payments
         SET yookassa_payment_id = ?, status = 'pending', updated_at = UTC_TIMESTAMP()
         WHERE payment_id = ? AND status = 'creating'`,
            "SELECT status FROM payments WHERE payment_id = ? LIMIT 1",
        ],
    });
});

test("a fast succeeded webhook cannot be overwritten by the create flow", async () => {
    const fake = paymentExecutor("succeeded");

    assert.equal(await persistCreatedYookassaPayment("local-1", "yk-1", fake.executor), "succeeded");
    assert.deepEqual(fake.snapshot(), {
        status: "succeeded",
        yookassaPaymentId: null,
        queries: fake.snapshot().queries,
    });
});

test("a fast canceled webhook cannot be overwritten by the create flow", async () => {
    const fake = paymentExecutor("canceled");

    assert.equal(await persistCreatedYookassaPayment("local-1", "yk-1", fake.executor), "canceled");
    assert.deepEqual(fake.snapshot(), {
        status: "canceled",
        yookassaPaymentId: null,
        queries: fake.snapshot().queries,
    });
});