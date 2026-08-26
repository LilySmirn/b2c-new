import assert from "node:assert/strict";
import test from "node:test";

import { getForwardedIp, normalizeIp } from "./requestIp";

test("reads the first forwarded client IP and falls back to x-real-ip", () => {
    assert.equal(getForwardedIp({ "x-forwarded-for": " 203.0.113.10, 10.0.0.1 " }), "203.0.113.10");
    assert.equal(getForwardedIp({ "x-real-ip": " 2001:db8::1 " }), "2001:db8::1");
    assert.equal(getForwardedIp({ "x-forwarded-for": " ", "x-real-ip": "1.2.3.4" }), "1.2.3.4");
});

test("normalizes empty and IPv4-mapped IP values without changing IPv6", () => {
    assert.equal(normalizeIp(null), null);
    assert.equal(normalizeIp("   "), null);
    assert.equal(normalizeIp(" ::ffff:1.2.3.4 "), "1.2.3.4");
    assert.equal(normalizeIp(" 2001:db8::1 "), "2001:db8::1");
});

test("normalizes stored and request forms to the same IP", () => {
    assert.equal(normalizeIp("1.2.3.4"), getForwardedIp({ "x-forwarded-for": "::ffff:1.2.3.4" }));
    assert.notEqual(normalizeIp("1.2.3.4"), getForwardedIp({ "x-forwarded-for": "5.6.7.8" }));
});