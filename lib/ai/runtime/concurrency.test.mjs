import assert from "node:assert/strict";
import test from "node:test";

import { tryAcquireRuntimeSlot } from "./concurrency.ts";

test("runtime slots enforce and release the concurrency bound", () => {
  const first = tryAcquireRuntimeSlot(2);
  const second = tryAcquireRuntimeSlot(2);

  assert.ok(first);
  assert.ok(second);
  assert.equal(tryAcquireRuntimeSlot(2), null);

  first.release();
  const replacement = tryAcquireRuntimeSlot(2);
  assert.ok(replacement);

  first.release();
  second.release();
  replacement.release();
});
