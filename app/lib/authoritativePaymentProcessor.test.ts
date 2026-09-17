import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderPaymentContext } from "./db";
import { processAuthoritativePayment } from "./authoritativePaymentProcessor";
import type { ProcessPaymentStatusInput, ProcessPaymentStatusResult } from "./processPaymentStatus";
import type { ProviderPayment, ProviderStatusResult } from "./yookassaStatusClient";

const local: ProviderPaymentContext = {
    paymentId: "local-1",
    yookassaPaymentId: "yk-1",
    userId: "user-1",
    tariffId: "tariff-1",
    amount: "100.00",
    orderNumber: "42",
    status: "pending",
    userLabel: "user@example.test",
    tariffTitle: "Test tariff",
};

function provider(status: string): ProviderPayment {
    return {
        id: "yk-1",
        status,
        amount: { value: "100.00", currency: "RUB" },
        metadata: { order_id: "42" },
        ...(status === "canceled"
            ? { cancellation_details: { reason: "insufficient_funds", party: "yoo_money" } }
            : {}),
    };
}

function dependencies(options: {
    providerResult?: ProviderStatusResult;
    process?: (input: ProcessPaymentStatusInput) => Promise<ProcessPaymentStatusResult | null>;
    notifications?: string[];
}) {
    return {
        getProviderPayment: async () => options.providerResult ?? { outcome: "ok" as const, payment: provider("pending") },
        processStatus: options.process ?? (async () => { throw new Error("processStatus must not be called"); }),
        markPending: async () => undefined,
        getSubscriptionExpiration: async () => null,
        notify: async (type: "error" | "card_error" | "success") => {
            options.notifications?.push(type);
            return { sent: true };
        },
        log: async () => undefined,
    };
}

test("provider pending leaves the local payment unfinished", async () => {
    let processed = 0;
    const result = await processAuthoritativePayment(local, "fallback", dependencies({
        process: async () => { processed += 1; return null; },
    }));
    assert.equal(result.outcome, "checked");
    assert.equal(result.outcome === "checked" && result.payment, null);
    assert.equal(processed, 0);
});

test("provider succeeded is finalized and success is notified only on the first transition", async () => {
    let transitions = 0;
    const notifications: string[] = [];
    const result = await processAuthoritativePayment(local, "fallback", dependencies({
        providerResult: { outcome: "ok", payment: provider("succeeded") },
        notifications,
        process: async () => ({
            paymentId: local.paymentId,
            status: "succeeded",
            cancellationReason: null,
            subscriptionChanged: ++transitions === 1,
            alreadyProcessed: transitions > 1,
        }),
    }));
    assert.equal(result.outcome === "checked" && result.payment?.status, "succeeded");
    assert.equal(transitions, 1);
    assert.deepEqual(notifications, ["success"]);
});

test("provider canceled uses finalization and the shared card_error notification", async () => {
    const notifications: string[] = [];
    let input: ProcessPaymentStatusInput | null = null;
    await processAuthoritativePayment(local, "fallback", dependencies({
        providerResult: { outcome: "ok", payment: provider("canceled") },
        notifications,
        process: async (value) => {
            input = value;
            return { paymentId: local.paymentId, status: "canceled", cancellationReason: "insufficient_funds", subscriptionChanged: false, alreadyProcessed: false };
        },
    }));
    assert.deepEqual(input, {
        paymentId: "local-1",
        status: "canceled",
        cancellationReason: "insufficient_funds",
        cancellationParty: "yoo_money",
    });
    assert.deepEqual(notifications, ["card_error"]);
});

test("provider timeout and network errors do not finalize or notify", async () => {
    for (const category of ["timeout", "network_error"]) {
        const notifications: string[] = [];
        let processed = false;
        const result = await processAuthoritativePayment(local, "fallback", dependencies({
            providerResult: { outcome: "error", category },
            notifications,
            process: async () => { processed = true; return null; },
        }));
        assert.deepEqual(result, { outcome: "provider_error", category, httpStatus: undefined });
        assert.equal(processed, false);
        assert.deepEqual(notifications, []);
    }
});

test("concurrent webhook and fallback produce one mutation and one notification", async () => {
    let finalized = false;
    let subscriptionChanges = 0;
    const notifications: string[] = [];
    const process = async (): Promise<ProcessPaymentStatusResult> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (!finalized) {
            finalized = true;
            subscriptionChanges += 1;
            return { paymentId: local.paymentId, status: "succeeded", cancellationReason: null, subscriptionChanged: true, alreadyProcessed: false };
        }
        return { paymentId: local.paymentId, status: "succeeded", cancellationReason: null, subscriptionChanged: false, alreadyProcessed: true };
    };
    const deps = dependencies({ providerResult: { outcome: "ok", payment: provider("succeeded") }, process, notifications });
    const results = await Promise.all([
        processAuthoritativePayment(local, "webhook", deps),
        processAuthoritativePayment(local, "fallback", deps),
    ]);
    assert.equal(results.filter((result) => result.outcome === "checked" && result.payment?.alreadyProcessed === false).length, 1);
    assert.equal(subscriptionChanges, 1);
    assert.deepEqual(notifications, ["success"]);
});