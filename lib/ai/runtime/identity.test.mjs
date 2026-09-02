import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureIdentityCookie,
  getAppSecret,
  signSessionCookie,
  verifySessionCookie,
} from "./identity.ts";

const encoder = new TextEncoder();
const secret = encoder.encode("a".repeat(64));
const otherSecret = encoder.encode("b".repeat(64));
const identity = {
  userId: "1f47f9f2-6f01-4f6a-953f-8f3f8f0f8f0f",
  composioSessionId: "sess_abc123",
  toolkits: ["metaads", "gmail"],
};

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

async function signRawPayload(payload, key) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload))
  );
  return `${toBase64Url(encoder.encode(payload))}.${toBase64Url(signature)}`;
}

test("signSessionCookie and verifySessionCookie round-trip an identity", async () => {
  const signed = await signSessionCookie(identity, secret);
  const result = await verifySessionCookie(signed, secret);
  assert.deepEqual(result, identity);
});

test("signSessionCookie is deterministic for a given secret", async () => {
  const first = await signSessionCookie(identity, secret);
  const second = await signSessionCookie(identity, secret);
  assert.equal(first, second);
});

test("verifySessionCookie rejects a cookie signed with a different secret", async () => {
  const signed = await signSessionCookie(identity, secret);
  const result = await verifySessionCookie(signed, otherSecret);
  assert.equal(result, null);
});

test("verifySessionCookie rejects tampered payloads", async () => {
  const signed = await signSessionCookie(identity, secret);
  const [payload, signature] = signed.split(".");
  const tamperedPayload = `${payload}x`;
  assert.equal(
    await verifySessionCookie(`${tamperedPayload}.${signature}`, secret),
    null
  );
});

test("verifySessionCookie rejects malformed and empty input", async () => {
  assert.equal(await verifySessionCookie(null, secret), null);
  assert.equal(await verifySessionCookie("", secret), null);
  assert.equal(await verifySessionCookie("not-a-cookie", secret), null);
  assert.equal(await verifySessionCookie("aaa.bbb.ccc", secret), null);
});

test("verifySessionCookie rejects a payload that is too large", async () => {
  const oversized = {
    userId: identity.userId,
    composioSessionId: "x".repeat(3000),
    toolkits: [],
  };
  const signed = await signSessionCookie(oversized, secret);
  assert.equal(await verifySessionCookie(signed, secret), null);
});

test("verifySessionCookie reads legacy cookies without toolkit tracking", async () => {
  const legacyCookie = await signRawPayload(
    `${identity.userId}:${identity.composioSessionId}`,
    secret
  );
  const result = await verifySessionCookie(legacyCookie, secret);
  assert.ok(result);
  assert.equal(result.userId, identity.userId);
  assert.equal(result.composioSessionId, identity.composioSessionId);
  assert.equal(result.toolkits, null);
});

test("signSessionCookie round-trips an empty toolkit selection", async () => {
  const signed = await signSessionCookie({ ...identity, toolkits: [] }, secret);
  const result = await verifySessionCookie(signed, secret);
  assert.deepEqual(result?.toolkits, []);
});

test("getAppSecret falls back to a stable in-process secret and warns once", async (context) => {
  const originalSecret = process.env.OXY_APP_SECRET;
  const originalWarn = console.warn;
  delete process.env.OXY_APP_SECRET;
  let warnings = 0;
  console.warn = () => {
    warnings += 1;
  };
  context.after(() => {
    console.warn = originalWarn;
    if (originalSecret === undefined) delete process.env.OXY_APP_SECRET;
    else process.env.OXY_APP_SECRET = originalSecret;
  });

  const first = getAppSecret();
  const second = getAppSecret();
  assert.equal(first, second);
  assert.ok(first instanceof Uint8Array);
  assert.equal(first.length, 32);
  assert.ok(warnings <= 1);
});

test("signSessionCookie round-trips an identity without a Composio session", async () => {
  const signed = await signSessionCookie(
    { userId: identity.userId, composioSessionId: "", toolkits: [] },
    secret
  );
  const result = await verifySessionCookie(signed, secret);
  assert.deepEqual(result, {
    userId: identity.userId,
    composioSessionId: "",
    toolkits: [],
  });
});

test("ensureIdentityCookie issues an anonymous identity when no cookie is present", async () => {
  const first = await ensureIdentityCookie(
    new Request("http://localhost/api/chat")
  );
  assert.match(
    first.identity.userId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
  assert.equal(first.identity.composioSessionId, "");
  assert.ok(first.setCookie);
});

test("ensureIdentityCookie reuses the userId from an existing valid cookie", async () => {
  const issued = await ensureIdentityCookie(
    new Request("http://localhost/api/chat")
  );
  const cookieValue = issued.setCookie.split(";")[0];
  const repeat = await ensureIdentityCookie(
    new Request("http://localhost/api/chat", {
      headers: { cookie: cookieValue },
    })
  );
  assert.equal(repeat.identity.userId, issued.identity.userId);
  assert.equal(repeat.setCookie, undefined);
});
