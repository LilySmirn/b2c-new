import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    clearPendingPaymentUiLifecycle,
    getPendingPaymentUiView,
    getOrCreatePendingPaymentUiLifecycle,
    getPendingNoticeStorageKey,
    PENDING_COUNTDOWN_MS,
    PENDING_RETRY_LINK_MS,
} from "./pendingPaymentUi";

function memoryStorage(): Storage {
    const values = new Map<string, string>();
    return {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => [...values.keys()][index] ?? null,
        removeItem: (key) => { values.delete(key); },
        setItem: (key, value) => { values.set(key, value); },
    };
}

    test("the first pending display stores a timestamp and starts at 30", () => {
    const storage = memoryStorage();
    const lifecycle = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 1_000);

    assert.equal(storage.getItem("pendingNotice:payment-1"), "1000");
    assert.deepEqual(getPendingPaymentUiView(lifecycle, 1_000), {
        phase: "countdown",
        secondsRemaining: 30,
    });
    assert.deepEqual(getPendingPaymentUiView(lifecycle, 2_001), {
        phase: "countdown",
        secondsRemaining: 29,
    });
});

test("refresh, polling, and navigation back preserve the original timestamp", () => {
    const storage = memoryStorage();
    const firstDisplay = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 1_000);
    const afterRefresh = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 11_000);
    const afterPoll = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 21_000);
    const afterNavigation = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 51_000);

    assert.equal(firstDisplay.startedAtMs, 1_000);
    assert.equal(afterRefresh.startedAtMs, 1_000);
    assert.equal(afterPoll.startedAtMs, 1_000);
    assert.equal(afterNavigation.startedAtMs, 1_000);
    assert.equal(storage.getItem("pendingNotice:payment-1"), "1000");
    assert.deepEqual(getPendingPaymentUiView(afterRefresh, 11_000), { phase: "countdown", secondsRemaining: 20 });
    assert.deepEqual(getPendingPaymentUiView(afterNavigation, 51_000), { phase: "retry" });
});

test("the retry phase lasts from 30 through 90 seconds", () => {
    const storage = memoryStorage();
    const lifecycle = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 1_000);

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

test("polling cannot redisplay a notice hidden after 90 seconds", () => {
    const storage = memoryStorage();
    getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 1_000);
    const afterHiddenPoll = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 91_000);

    assert.deepEqual(getPendingPaymentUiView(afterHiddenPoll, 91_000), { phase: "hidden" });
    assert.equal(storage.getItem("pendingNotice:payment-1"), "1000");
});

test("different payment ids have separate session lifecycles", () => {
    const storage = memoryStorage();
    const first = getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 1_000);
    const second = getOrCreatePendingPaymentUiLifecycle(storage, "payment-2", 100_000);

    assert.equal(first.startedAtMs, 1_000);
    assert.equal(second.startedAtMs, 100_000);
    assert.equal(storage.getItem(getPendingNoticeStorageKey("payment-1")), "1000");
    assert.equal(storage.getItem(getPendingNoticeStorageKey("payment-2")), "100000");
});

 test("an existing key is never overwritten", () => {
    const storage = memoryStorage();
    storage.setItem("pendingNotice:payment-1", "not-a-timestamp");

    getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 10_000);

    assert.equal(storage.getItem("pendingNotice:payment-1"), "not-a-timestamp");
});

test("a final payment status removes its pending lifecycle", () => {
    const storage = memoryStorage();
    getOrCreatePendingPaymentUiLifecycle(storage, "payment-1", 1_000);
    clearPendingPaymentUiLifecycle(storage, "payment-1");

    assert.equal(storage.getItem("pendingNotice:payment-1"), null);
});

test("profile pending UI cannot call the removed server retry countdown helper", () => {
    const profileSource = readFileSync(new URL("./PaymentStateNotice.tsx", import.meta.url), "utf8");
    const currentPaymentRoute = readFileSync(
        new URL("../api/payments/current/route.ts", import.meta.url),
        "utf8",
    );

    assert.doesNotMatch(profileSource, /getRetrySecondsRemaining|retryAllowedAt/);
    assert.doesNotMatch(currentPaymentRoute, /getRetrySecondsRemaining|retryAllowedAt/);
});