import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { checkWebhookHealth, createYookassaPayment, formatRubAmount } from "./yookassaPaymentClient";

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
});

test("formatRubAmount always returns two decimal places", () => {
    assert.equal(formatRubAmount(100), "100.00");
    assert.equal(formatRubAmount(1299.5), "1299.50");
});

test("health check requires HTTP 200 and { ok: true }", async () => {
    process.env.YOOKASSA_WEBHOOK_SERVICE_URL = "http://localhost:3001/";
    process.env.WEBHOOK_HEALTH_SECRET = "health-secret";
    global.fetch = async (input, init) => {
        assert.equal(input, "http://localhost:3001/health");
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer health-secret");
        return Response.json({ ok: true });
    };
    assert.deepEqual(await checkWebhookHealth(), { ok: true });
});

test("YooKassa request uses Basic Auth, saved idempotency key and redirect body", async () => {
    process.env.YOOKASSA_SHOP_ID = "shop-id";
    process.env.YOOKASSA_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";
    global.fetch = async (input, init) => {
        assert.equal(input, "https://api.yookassa.ru/v3/payments");
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("Authorization"), `Basic ${Buffer.from("shop-id:test-secret").toString("base64")}`);
        assert.equal(headers.get("Idempotence-Key"), "saved-key");
        assert.deepEqual(JSON.parse(String(init?.body)), {
            amount: { value: "250.00", currency: "RUB" },
            capture: true,
            confirmation: { type: "redirect", return_url: "http://localhost:3000/profile" },
            description: "Заказ №37",
            metadata: { order_id: "37" },
            receipt: {
                customer: { email: "buyer@example.com" },
                items: [{
                    description: "Оптимальный",
                    quantity: 1,
                    amount: { value: "250.00", currency: "RUB" },
                    vat_code: 1,
                    payment_mode: "full_payment",
                    payment_subject: "service",
                    measure: "piece",
                }],
                timezone: 3,
                internet: "true",
            },
        });
        return Response.json({
            id: "yk-test-id",
            status: "pending",
            confirmation: { confirmation_url: "https://yookassa.test/confirmation" },
        });
    };
    assert.deepEqual(await createYookassaPayment({
        amount: 250,
        idempotencyKey: "saved-key",
        orderNumber: "37",
        tariffName: "Оптимальный",
        customerEmail: "buyer@example.com",
    }), {
        outcome: "created",
        id: "yk-test-id",
        status: "pending",
        confirmationUrl: "https://yookassa.test/confirmation",
    });
});

test("4xx is rejected while 5xx remains ambiguous", async () => {
    process.env.YOOKASSA_SHOP_ID = "shop-id";
    process.env.YOOKASSA_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    global.fetch = async () => Response.json(
        { type: "error", code: "invalid_request", description: "Bad amount", parameter: "amount.value" },
        { status: 400 },
    );
    const paymentInput = {
        amount: 100,
        idempotencyKey: "key",
        orderNumber: "38",
        tariffName: "Базовый",
        customerEmail: "buyer@example.com",
    };
    assert.deepEqual(await createYookassaPayment(paymentInput), {
        outcome: "rejected",
        httpStatus: 400,
        error: { type: "error", code: "invalid_request", description: "Bad amount", parameter: "amount.value" },
    });

    global.fetch = async () => Response.json({ code: "internal_server_error" }, { status: 500 });
    const ambiguous = await createYookassaPayment(paymentInput);
    assert.equal(ambiguous.outcome, "ambiguous");
    assert.equal(ambiguous.httpStatus, 500);
});