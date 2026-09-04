import assert from "node:assert/strict";
import test from "node:test";
import { createWebhookServer } from "../src/app.js";

const config = { webhookHealthSecret: "health-secret", paymentInternalSecret: "internal-secret", b2cInternalUrl: "http://b2c.test" };

async function withServer(fetchImpl, callback) {
    const server = createWebhookServer(config, { fetchImpl });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try { await callback(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise((resolve) => server.close(resolve)); }
}

test("health requires its own bearer secret", async () => withServer(fetch, async (base) => {
    assert.equal((await fetch(`${base}/health`)).status, 401);
    assert.equal((await fetch(`${base}/health`, { headers: { authorization: "Bearer wrong" } })).status, 401);
    const response = await fetch(`${base}/health`, { headers: { authorization: "Bearer health-secret" } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
}));

test("forwards succeeded and canceled using only provider fields", async () => {
    const forwarded = [];
    await withServer(async (url, options) => {
        forwarded.push({ url: String(url), options });
        return new Response("{}", { status: 200 });
    }, async (base) => {
        for (const body of [
            { event: "payment.succeeded", object: { id: "yk-1", amount: "100", metadata: { userId: "evil" } } },
            { event: "payment.succeeded", object: { id: "yk-1", amount: "100", metadata: { userId: "evil" } } },
            { event: "payment.canceled", object: { id: "yk-2", cancellation_details: { reason: "expired_on_confirmation" } } },
        ]) assert.equal((await fetch(`${base}/yookassa/webhook`, { method: "POST", body: JSON.stringify(body) })).status, 200);
    });
    assert.deepEqual(JSON.parse(forwarded[0].options.body), { yookassaPaymentId: "yk-1", status: "succeeded" });
    assert.deepEqual(JSON.parse(forwarded[1].options.body), { yookassaPaymentId: "yk-1", status: "succeeded" });
    assert.deepEqual(JSON.parse(forwarded[2].options.body), { yookassaPaymentId: "yk-2", status: "canceled", cancellationReason: "expired_on_confirmation" });
    assert.equal(forwarded[0].options.headers.authorization, "Bearer internal-secret");
});

test("acknowledges permanent errors and unsupported events", async () => {
    await withServer(async () => new Response("{}", { status: 404 }), async (base) => {
        const unknown = await fetch(`${base}/yookassa/webhook`, { method: "POST", body: JSON.stringify({ event: "payment.succeeded", object: { id: "missing" } }) });
        assert.equal(unknown.status, 200);
        const unsupported = await fetch(`${base}/yookassa/webhook`, { method: "POST", body: JSON.stringify({ event: "refund.succeeded", object: { id: "refund" } }) });
        assert.equal(unsupported.status, 200);
    });
});

test("returns non-2xx when B2C is unavailable", async () => {
    await withServer(async () => { throw new TypeError("network failed"); }, async (base) => {
        const response = await fetch(`${base}/yookassa/webhook`, { method: "POST", body: JSON.stringify({ event: "payment.succeeded", object: { id: "yk-1" } }) });
        assert.equal(response.status, 502);
    });
});

test("rejects malformed relevant notifications", async () => withServer(fetch, async (base) => {
    assert.equal((await fetch(`${base}/yookassa/webhook`, { method: "POST", body: "{" })).status, 400);
    assert.equal((await fetch(`${base}/yookassa/webhook`, { method: "POST", body: JSON.stringify({ event: "payment.canceled", object: { id: "yk" } }) })).status, 400);
}));