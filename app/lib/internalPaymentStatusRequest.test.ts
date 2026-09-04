import assert from "node:assert/strict";
import test from "node:test";
import { hasValidInternalSecret, parseInternalPaymentStatus } from "./internalPaymentStatusRequest";

test("internal authorization accepts only the configured bearer secret", () => {
    assert.equal(hasValidInternalSecret(null, "right"), false);
    assert.equal(hasValidInternalSecret("Bearer wrong", "right"), false);
    assert.equal(hasValidInternalSecret("Bearer right", "right"), true);
    assert.equal(hasValidInternalSecret("Bearer right", undefined), false);
});

test("internal payload accepts only provider id and final statuses", () => {
    assert.deepEqual(parseInternalPaymentStatus({ yookassaPaymentId: " yk-1 ", status: "succeeded", userId: "ignored" }), {
        yookassaPaymentId: "yk-1", status: "succeeded", cancellationReason: null,
    });
    assert.deepEqual(parseInternalPaymentStatus({ yookassaPaymentId: "yk-2", status: "canceled", cancellationReason: "expired" }), {
        yookassaPaymentId: "yk-2", status: "canceled", cancellationReason: "expired",
    });
    assert.equal(parseInternalPaymentStatus({ yookassaPaymentId: "yk-2", status: "canceled" }), null);
    assert.equal(parseInternalPaymentStatus({ yookassaPaymentId: "yk-2", status: "pending" }), null);
});