import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db, { getTariffPrice } from "@/app/lib/db";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";
import { notifyPaymentInfrastructureFailure } from "@/app/lib/paymentInfrastructureNotifier";
import { checkWebhookHealth, createYookassaPayment } from "@/app/lib/yookassaPaymentClient";
import { sendPaymentTelegramNotification } from "@/app/lib/paymentTelegramNotifier";

const publicError = {
    error: "PAYMENT_CREATION_FAILED",
    message: "Произошла ошибка, попробуйте позже",
};

export async function POST(request: NextRequest) {
    const session = await requireActiveB2cSession("api");

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { code: "INVALID_REQUEST", error: "Request body must be valid JSON" },
            { status: 400 },
        );
    }

    const tariffId = typeof body === "object" && body !== null &&
        typeof (body as { tariffId?: unknown }).tariffId === "string"
        ? (body as { tariffId: string }).tariffId.trim()
        : "";

    if (!tariffId) {
        return NextResponse.json(
            { code: "INVALID_TARIFF_ID", error: "tariffId is required" },
            { status: 400 },
        );
    }

    const paymentId = uuidv4();
    const database = new db();

    try {
        // Validate the requested tariff before checking payment infrastructure. Its
        // price is still read exclusively from tariffs in the creation transaction.
        const tariffPrice = await getTariffPrice(tariffId);
        if (tariffPrice === null) {
            return NextResponse.json(
                { code: "TARIFF_NOT_FOUND", error: "Tariff not found" },
                { status: 404 },
            );
        }

        const health = await checkWebhookHealth();
        if (!health.ok) {
            const context = { userId: session.user.id, tariffId };
            await logPaymentEvent("webhook_health_failed", paymentId, { ...context, ...health });
            await logPaymentEvent("payment_creation_blocked", paymentId, {
                ...context,
                category: `webhook_health_${health.category}`,
            });
            await notifyPaymentInfrastructureFailure({ paymentId, ...context, category: health.category });
            return NextResponse.json(
                { error: "PAYMENT_SERVICE_UNAVAILABLE", message: publicError.message },
                { status: 503 },
            );
        }

        const result = await database.createPendingPayment(
            session.user.id,
            tariffId,
            paymentId,
        );

        if (result.outcome === "tariff_not_found") {
            return NextResponse.json(
                { code: "TARIFF_NOT_FOUND", error: "Tariff not found" },
                { status: 404 },
            );
        }

        if (result.outcome === "already_pending") {
            await logPaymentEvent("payment_creation_blocked", result.payment.paymentId, {
                userId: session.user.id,
                tariffId,
                category: "unfinished_payment_exists",
                status: result.payment.status,
            });
            return NextResponse.json(
                { code: "PAYMENT_ALREADY_PENDING", payment: result.payment },
                { status: 409 },
            );
        }

        const context = {
            userId: session.user.id,
            tariffId,
            orderNumber: result.payment.orderNumber,
        };
        await logPaymentEvent("payment_create_started", paymentId, context);

        await logPaymentEvent("webhook_health_ok", paymentId, context);
        await logPaymentEvent("yookassa_create_started", paymentId, context);
        const yookassa = await createYookassaPayment({
            amount: result.payment.amount,
            idempotencyKey: result.payment.idempotencyKey,
            orderNumber: result.payment.orderNumber,
            tariffName: result.payment.tariffName,
            customerEmail: result.payment.customerEmail,
        });

        if (yookassa.outcome === "created") {
            await database.markPaymentCheckoutCreated(paymentId, yookassa.id);
            await logPaymentEvent("yookassa_create_succeeded", paymentId, {
                ...context,
                yookassaPaymentId: yookassa.id,
                status: yookassa.status,
            });
            return NextResponse.json({
                paymentId,
                status: "creating",
                tariffName: result.payment.tariffName,
                confirmationUrl: yookassa.confirmationUrl,
            }, { status: 201 });
        }

        if (yookassa.outcome === "rejected") {
            await database.markPaymentError(paymentId);
        }
        await logPaymentEvent("yookassa_create_failed", paymentId, {
            ...context,
            httpStatus: yookassa.httpStatus,
            errorCategory: yookassa.outcome === "ambiguous" ? yookassa.category : "rejected",
            ...(yookassa.error ?? {}),
        });

        const unavailable = yookassa.outcome === "rejected" && yookassa.error.code === "configuration_missing";
        return NextResponse.json(
            unavailable
                ? { error: "PAYMENT_SERVICE_UNAVAILABLE", message: publicError.message }
                : publicError,
            { status: unavailable ? 503 : 502 },
        );
    } catch (error) {
        await sendPaymentTelegramNotification("error", {
            user: session.user.email ?? session.user.id,
            paymentId,
            tariff: tariffId,
            error,
            stage: "создание платежа",
        });
        await logPaymentEvent("payment_creation_exception", paymentId, {
            userId: session.user.id,
            tariffId,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        return NextResponse.json(publicError, { status: 500 });
    }
}