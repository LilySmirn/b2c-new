import assert from "node:assert/strict";
import test from "node:test";
import {
    getRetryAllowedAt,
    getRetrySecondsRemaining,
    isPaymentRetryBlocked,
} from "./paymentRetry";

const createdAt = new Date("2026-09-18T12:00:00.000Z");

test("a pending payment blocks creation for its first 30 seconds", () => {
    assert.equal(isPaymentRetryBlocked(createdAt, new Date("2026-09-18T12:00:29.999Z")), true);
    assert.equal(getRetrySecondsRemaining(getRetryAllowedAt(createdAt), createdAt), 30);
});

test("a pending payment permits creation at the persisted 30-second deadline", () => {
    assert.equal(isPaymentRetryBlocked(createdAt, new Date("2026-09-18T12:00:30.000Z")), false);
    assert.equal(getRetrySecondsRemaining(getRetryAllowedAt(createdAt), new Date("2026-09-18T12:00:30.000Z")), 0);
});

test("the server retry deadline remains derived from created_at independently of UI refreshes", () => {
    const retryAllowedAt = getRetryAllowedAt(createdAt);
    assert.equal(getRetrySecondsRemaining(retryAllowedAt, new Date("2026-09-18T12:00:11.200Z")), 19);
    assert.equal(getRetrySecondsRemaining(retryAllowedAt, new Date("2026-09-18T12:00:29.200Z")), 1);
    assert.equal(getRetrySecondsRemaining(retryAllowedAt, new Date("2026-09-18T12:01:00.000Z")), 0);
});