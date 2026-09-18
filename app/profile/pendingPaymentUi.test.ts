import assert from "node:assert/strict";
import test from "node:test";
import {
    getPendingPaymentUiView,
    observePendingPayment,
    PENDING_COUNTDOWN_MS,
    PENDING_RETRY_LINK_MS,
} from "./pendingPaymentUi";

test("an old server payment still receives a fresh 30-second UI countdown", () => {
    const mountedAt = Date.parse("2026-09-18T12:05:00.000Z");
    const lifecycle = observePendingPayment(null, "payment-old", mountedAt);

    assert.deepEqual(getPendingPaymentUiView(lifecycle, mountedAt), {
        phase: "countdown",
        secondsRemaining: 30,
    });
});

test("the visual countdown decreases without a reload", () => {
    const lifecycle = observePendingPayment(null, "payment-1", 1_000);

    assert.deepEqual(getPendingPaymentUiView(lifecycle, 2_001), {
        phase: "countdown",
        secondsRemaining: 29,
    });
    assert.deepEqual(getPendingPaymentUiView(lifecycle, 29_001), {
        phase: "countdown",
        secondsRemaining: 2,
    });
});

test("polling the same payment id preserves the lifecycle start and hidden state", () => {
    const lifecycle = observePendingPayment(null, "payment-1", 1_000);
    const afterPoll = observePendingPayment(lifecycle, "payment-1", 20_000);
    const afterHiddenPoll = observePendingPayment(afterPoll, "payment-1", 100_000);

    assert.strictEqual(afterPoll, lifecycle);
    assert.strictEqual(afterHiddenPoll, lifecycle);
    assert.deepEqual(getPendingPaymentUiView(afterHiddenPoll, 100_000), { phase: "hidden" });
});

test("the retry link phase follows the countdown for exactly 60 seconds", () => {
    const lifecycle = observePendingPayment(null, "payment-1", 1_000);

    assert.deepEqual(getPendingPaymentUiView(lifecycle, 1_000 + PENDING_COUNTDOWN_MS), { phase: "retry" });
    assert.deepEqual(
        getPendingPaymentUiView(lifecycle, 1_000 + PENDING_COUNTDOWN_MS + PENDING_RETRY_LINK_MS - 1),
        { phase: "retry" },
    );
    assert.deepEqual(
        getPendingPaymentUiView(lifecycle, 1_000 + PENDING_COUNTDOWN_MS + PENDING_RETRY_LINK_MS),
        { phase: "hidden" },
    );
});

test("a different payment id starts its own complete lifecycle", () => {
    const first = observePendingPayment(null, "payment-1", 1_000);
    const second = observePendingPayment(first, "payment-2", 100_000);

    assert.notStrictEqual(second, first);
    assert.deepEqual(getPendingPaymentUiView(second, 100_000), {
        phase: "countdown",
        secondsRemaining: 30,
    });
});

test("a new page mount can start a fresh lifecycle without using retryAllowedAt", () => {
    const firstMount = observePendingPayment(null, "payment-1", 1_000);
    const refreshedMount = observePendingPayment(null, "payment-1", 200_000);

    assert.equal(firstMount.startedAtMs, 1_000);
    assert.equal(refreshedMount.startedAtMs, 200_000);
});