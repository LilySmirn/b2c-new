import assert from "node:assert/strict";
import test from "node:test";
import { finalStatusToProcess, getYookassaPayment, paymentIntegrityError, rublesToKopecks } from "./yookassaStatusClient";

const local = { yookassaPaymentId: "yk-1", amount: "100.00", orderNumber: "42" };
const provider = { id: "yk-1", status: "succeeded", amount: { value: "100.0", currency: "RUB" }, metadata: { order_id: 42 } };

test("money is compared exactly in kopecks", () => {
    assert.equal(rublesToKopecks("100.10"), BigInt(10010));
    assert.equal(paymentIntegrityError(local, provider), null);
    assert.equal(paymentIntegrityError(local, { ...provider, amount: { value: "100.01", currency: "RUB" } }), "amount_mismatch");
});

test("provider ownership fields must match the local payment", () => {
    assert.equal(paymentIntegrityError(local, { ...provider, id: "forged" }), "payment_id_mismatch");
    assert.equal(paymentIntegrityError(local, { ...provider, metadata: { order_id: "43" } }), "order_id_mismatch");
    assert.equal(paymentIntegrityError(local, { ...provider, amount: { value: "100.00", currency: "USD" } }), "currency_mismatch");
});

test("only the status returned by GET can select a final transition", () => {
    assert.equal(finalStatusToProcess("pending"), null);
    assert.equal(finalStatusToProcess("canceled"), "canceled");
    assert.equal(finalStatusToProcess("succeeded"), "succeeded");
    assert.equal(finalStatusToProcess("waiting_for_capture"), null);
});

test("GET uses Basic auth and distinguishes provider failures", async () => {
    process.env.YOOKASSA_SHOP_ID = "shop";
    process.env.YOOKASSA_SECRET_KEY = "secret";
    const ok = await getYookassaPayment("id/with slash", async (input, init) => {
        assert.equal(String(input), "https://api.yookassa.ru/v3/payments/id%2Fwith%20slash");
        assert.equal(new Headers(init?.headers).get("Authorization"), `Basic ${Buffer.from("shop:secret").toString("base64")}`);
        return new Response(JSON.stringify(provider), { status: 200 });
    });
    assert.equal(ok.outcome, "ok");
    assert.deepEqual(await getYookassaPayment("missing", async () => new Response("{}", { status: 404 })), { outcome: "error", category: "not_found", httpStatus: 404 });
    assert.deepEqual(await getYookassaPayment("bad", async () => new Response("{}", { status: 503 })), { outcome: "error", category: "provider_http_error", httpStatus: 503 });
});