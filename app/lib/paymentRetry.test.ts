import assert from "node:assert/strict";
import test from "node:test";
import {
    getRetryAllowedAt,
    isPaymentRetryBlocked,
} from "./paymentRetry";

const createdAt = new Date("2026-09-18T12:00:00.000Z");

test("a pending payment blocks creation for its first 30 seconds", () => {
    assert.equal(isPaymentRetryBlocked(createdAt, new Date("2026-09-18T12:00:29.999Z")), true);
    assert.equal(getRetryAllowedAt(createdAt).toISOString(), "2026-09-18T12:00:30.000Z");
});

test("a pending payment permits creation at the created_at plus 30-second deadline", () => {
    assert.equal(isPaymentRetryBlocked(createdAt, new Date("2026-09-18T12:00:30.000Z")), false);
});

test("the server retry deadline is independent of pending UI lifecycle timestamps", () => {
    const retryAllowedAt = getRetryAllowedAt(createdAt);
    const unrelatedUiLifecycleStarts = [
        new Date("2026-09-18T12:00:11.200Z"),
        new Date("2026-09-18T12:01:00.000Z"),
    ];

    assert.equal(retryAllowedAt.toISOString(), "2026-09-18T12:00:30.000Z");
    assert.equal(unrelatedUiLifecycleStarts.every((value) => value.getTime() !== retryAllowedAt.getTime()), true);
});