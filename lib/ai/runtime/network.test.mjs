import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchPublicUrl,
  isPublicIpAddress,
  readBoundedText,
  validatePublicHttpUrl,
} from "./network.ts";

test("isPublicIpAddress accepts public unicast addresses", () => {
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("isPublicIpAddress blocks private and special-use addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
});

test("validatePublicHttpUrl rejects unsafe URL forms before fetching", async () => {
  await assert.rejects(validatePublicHttpUrl("file:///etc/passwd"), /HTTP/);
  await assert.rejects(validatePublicHttpUrl("http://localhost/test"), /public hostname/);
  await assert.rejects(validatePublicHttpUrl("http://127.0.0.1/test"), /private or reserved/);
  await assert.rejects(validatePublicHttpUrl("http://user:pass@example.com"), /credentials/);
});

test("fetchPublicUrl validates redirect destinations", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data" },
    });

  await assert.rejects(
    fetchPublicUrl("http://8.8.8.8/start", {
      signal: new AbortController().signal,
    }),
    /private or reserved/
  );
});

test("readBoundedText stops reading at its byte budget", async () => {
  const result = await readBoundedText(new Response("abcdefghij"), 5);

  assert.deepEqual(result, { text: "abcde", truncated: true });
});

test("readBoundedText returns complete responses below its budget", async () => {
  const result = await readBoundedText(new Response("hello"), 10);

  assert.deepEqual(result, { text: "hello", truncated: false });
});
