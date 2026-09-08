import assert from "node:assert/strict";
import test from "node:test";
import { hasValidInternalSecret, parseInternalPaymentStatus } from "./internalPaymentStatusRequest";

test("internal authorization accepts only the configured bearer secret", () => {
    assert.equal(hasValidInternalSecret(null, "right"), false);
    assert.equal(hasValidInternalSecret("Bearer wrong", "right"), false);
    assert.equal(hasValidInternalSecret("Bearer right", "right"), true);
    assert.equal(hasValidInternalSecret("Bearer right", undefined), false);
});

test("internal payload accepts a provider id and does not trust a supplied status", () => {
    assert.deepEqual(parseInternalPaymentStatus({ yookassaPaymentId: " yk-1 ", status: "succeeded", userId: "ignored" }), {
        yookassaPaymentId: "yk-1", event: null,
    });
    assert.deepEqual(parseInternalPaymentStatus({ yookassaPaymentId: "yk-2", event: "payment.canceled" }), {
        yookassaPaymentId: "yk-2", event: "payment.canceled",
    });
    assert.equal(parseInternalPaymentStatus({ status: "succeeded" }), null);
});