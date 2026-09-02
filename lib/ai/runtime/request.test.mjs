import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAllowedMessageCount,
  MAX_CHAT_MESSAGES,
  parseChatRequest,
} from "./request.ts";

test("parseChatRequest parses a bounded JSON request", async () => {
  const result = await parseChatRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    })
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.body, { messages: [] });
});

test("parseChatRequest rejects a declared oversized body", async () => {
  const result = await parseChatRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-length": "1000" },
      body: "{}",
    }),
    10
  );

  assert.deepEqual(result, {
    ok: false,
    status: 413,
    error: "Request body is too large.",
  });
});

test("parseChatRequest rejects a streamed oversized body", async () => {
  const result = await parseChatRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: ["too large"] }),
    }),
    8
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("parseChatRequest rejects malformed JSON", async () => {
  const result = await parseChatRequest(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: "not-json",
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("hasAllowedMessageCount enforces the conversation bound", () => {
  assert.equal(hasAllowedMessageCount({ messages: [] }), true);
  assert.equal(
    hasAllowedMessageCount({ messages: Array(MAX_CHAT_MESSAGES).fill(null) }),
    true
  );
  assert.equal(
    hasAllowedMessageCount({ messages: Array(MAX_CHAT_MESSAGES + 1).fill(null) }),
    false
  );
  assert.equal(hasAllowedMessageCount({ messages: "invalid" }), false);
});
