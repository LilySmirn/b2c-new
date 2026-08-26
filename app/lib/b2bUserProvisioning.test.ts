import assert from "node:assert/strict";
import test from "node:test";

import bcrypt from "bcryptjs";

import {
    B2B_PASSWORD_LENGTH,
    generateB2bPassword,
    hasValidAdminAuthorization,
    validateB2bUserPayload,
} from "./b2bUserProvisioning";

test("normalizes a login and accepts IPv4, IPv6, and an omitted IP", () => {
    assert.deepEqual(validateB2bUserPayload({ login: " Clinic-DEMO ", ip: "1.2.3.4" }), {
        value: { login: "clinic-demo", ip: "1.2.3.4" },
    });
    assert.deepEqual(validateB2bUserPayload({ login: "ipv6", ip: "2001:db8::1" }), {
        value: { login: "ipv6", ip: "2001:db8::1" },
    });
    assert.deepEqual(validateB2bUserPayload({ login: "no-ip" }), {
        value: { login: "no-ip", ip: null },
    });
});

test("rejects invalid input", () => {
    assert.deepEqual(validateB2bUserPayload({ login: "  " }), { error: "Логин обязателен" });
    assert.deepEqual(validateB2bUserPayload({ login: "clinic", ip: "not-an-ip" }), {
        error: "Некорректный IP-адрес",
    });
});

test("requires the configured bearer secret", () => {
    const previousSecret = process.env.B2B_ADMIN_SECRET;
    process.env.B2B_ADMIN_SECRET = "test-admin-secret";

    try {
        assert.equal(hasValidAdminAuthorization(new Request("http://localhost")), false);
        assert.equal(hasValidAdminAuthorization(new Request("http://localhost", {
            headers: { authorization: "Bearer wrong-secret" },
        })), false);
        assert.equal(hasValidAdminAuthorization(new Request("http://localhost", {
            headers: { authorization: "Bearer test-admin-secret" },
        })), true);
    } finally {
        if (previousSecret === undefined) delete process.env.B2B_ADMIN_SECRET;
        else process.env.B2B_ADMIN_SECRET = previousSecret;
    }
});

test("generates a bcrypt-compatible password with every required character class", async () => {
    const password = generateB2bPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    assert.equal(password.length, B2B_PASSWORD_LENGTH);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[!@#$%_-]/);
    assert.equal(await bcrypt.compare(password, passwordHash), true);
    assert.equal(passwordHash.includes(password), false);
});