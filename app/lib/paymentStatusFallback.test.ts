import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentStatus, ProviderPaymentContext } from "./db";
import { PAYMENT_STATUS_CHECK_COOLDOWN_SECONDS, reconcilePaymentStatusFallback } from "./paymentStatusFallback";

const payment: PaymentStatus = {
    paymentId: "local-1",
    tariffId: "tariff-1",
    tariffName: "Test tariff",
    status: "pending",
    cancellationReason: null,
};
const context: ProviderPaymentContext = {
    paymentId: payment.paymentId,
    yookassaPaymentId: "yk-1",
    userId: "user-1",
    tariffId: payment.tariffId,
    amount: "100.00",
    orderNumber: "42",
    status: "pending",
    userLabel: "user@example.test",
    tariffTitle: payment.tariffName,
};

function dependencies(overrides: Partial<{
    getOwnedContext: (userId: string, paymentId: string) => Promise<ProviderPaymentContext | null>;
    claimCheck: (userId: string, paymentId: string, cooldown: number) => Promise<boolean>;
    process: () => Promise<never>;
    log: (event: string) => Promise<void>;
}> = {}) {
    return {
        getOwnedContext: overrides.getOwnedContext ?? (async () => context),
        claimCheck: overrides.claimCheck ?? (async () => true),
        process: overrides.process ?? (async () => { throw new Error("process must not be called"); }),
        log: overrides.log ?? (async () => undefined),
    };
}

test("unexpired cooldown skips the YooKassa pipeline", async () => {
    let processed = false;
    const events: string[] = [];
    await reconcilePaymentStatusFallback("user-1", payment, dependencies({
        claimCheck: async (_userId, _paymentId, cooldown) => {
            assert.equal(cooldown, PAYMENT_STATUS_CHECK_COOLDOWN_SECONDS);
            return false;
        },
        process: async () => { processed = true; throw new Error("unexpected"); },
        log: async (event) => { events.push(event); },
    }));
    assert.equal(processed, false);
    assert.deepEqual(events, ["yookassa_fallback_check_skipped_cooldown"]);
});

test("terminal local states never claim cooldown or call the provider pipeline", async () => {
    for (const status of ["succeeded", "canceled"] as const) {
        let databaseTouched = false;
        await reconcilePaymentStatusFallback("user-1", { ...payment, status }, dependencies({
            getOwnedContext: async () => { databaseTouched = true; return context; },
        }));
        assert.equal(databaseTouched, false);
    }
});

test("a user cannot reconcile a payment without an owned provider context", async () => {
    let claimed = false;
    let processed = false;
    await reconcilePaymentStatusFallback("other-user", payment, dependencies({
        getOwnedContext: async (userId, paymentId) => {
            assert.equal(userId, "other-user");
            assert.equal(paymentId, "local-1");
            return null;
        },
        claimCheck: async () => { claimed = true; return true; },
        process: async () => { processed = true; throw new Error("unexpected"); },
    }));
    assert.equal(claimed, false);
    assert.equal(processed, false);
});

test("nearly simultaneous polls produce one provider request", async () => {
    let claimed = false;
    let providerRequests = 0;
    const deps = dependencies({
        claimCheck: async () => {
            if (claimed) return false;
            claimed = true;
            return true;
        },
        process: async () => {
            providerRequests += 1;
            await new Promise((resolve) => setTimeout(resolve, 5));
            throw new Error("simulated completion");
        },
    });
    await Promise.all(Array.from({ length: 5 }, () => reconcilePaymentStatusFallback("user-1", payment, deps)));
    assert.equal(providerRequests, 1);
});