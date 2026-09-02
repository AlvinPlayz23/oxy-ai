import assert from "node:assert/strict";
import test from "node:test";

import { deriveTitle } from "./title.ts";

function userMessage(text) {
  return {
    id: "m1",
    role: "user",
    parts: text === undefined ? [] : [{ type: "text", text }],
  };
}

test("deriveTitle falls back when there are no messages", () => {
  assert.equal(deriveTitle([]), "New chat");
});

test("deriveTitle falls back when there is no user message", () => {
  assert.equal(
    deriveTitle([
      { id: "a", role: "assistant", parts: [{ type: "text", text: "hi" }] },
    ]),
    "New chat"
  );
});

test("deriveTitle falls back when the user message has no text part", () => {
  assert.equal(
    deriveTitle([{ id: "a", role: "user", parts: [{ type: "file" }] }]),
    "New chat"
  );
});

test("deriveTitle falls back for whitespace-only text", () => {
  assert.equal(deriveTitle([userMessage("   \n\t ")]), "New chat");
});

test("deriveTitle trims and collapses whitespace", () => {
  assert.equal(deriveTitle([userMessage("  hello\n\n  world  ")]), "hello world");
});

test("deriveTitle keeps short titles intact", () => {
  assert.equal(deriveTitle([userMessage("Launch plan for Q3")]), "Launch plan for Q3");
});

test("deriveTitle truncates long text to 60 characters with an ellipsis", () => {
  const title = deriveTitle([userMessage("a".repeat(100))]);
  assert.equal(title.length, 60);
  assert.ok(title.endsWith("..."));
  assert.ok(title.startsWith("aaaa"));
});

test("deriveTitle uses the first user message only", () => {
  assert.equal(
    deriveTitle([
      userMessage("first message"),
      { id: "b", role: "assistant", parts: [{ type: "text", text: "reply" }] },
      { id: "c", role: "user", parts: [{ type: "text", text: "second message" }] },
    ]),
    "first message"
  );
});
