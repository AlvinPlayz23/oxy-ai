import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ENABLED_TOOLKITS,
  effectiveToolkitSelection,
  sanitizeToolkitSelection,
} from "./composio-catalog.ts";

test("sanitizeToolkitSelection lowercases, trims, dedupes and caps slugs", () => {
  const result = sanitizeToolkitSelection([
    " GMAIL ",
    "gmail",
    "metaads",
    42,
    null,
    "bad slug!",
  ]);
  assert.deepEqual(result, ["gmail", "metaads"]);
});

test("sanitizeToolkitSelection rejects non-array input", () => {
  assert.deepEqual(sanitizeToolkitSelection(undefined), []);
  assert.deepEqual(sanitizeToolkitSelection("gmail"), []);
  assert.deepEqual(sanitizeToolkitSelection({}), []);
});

test("effectiveToolkitSelection falls back to defaults when the field is absent", () => {
  assert.deepEqual(effectiveToolkitSelection(undefined), DEFAULT_ENABLED_TOOLKITS);
  assert.deepEqual(effectiveToolkitSelection("nope"), DEFAULT_ENABLED_TOOLKITS);
});

test("effectiveToolkitSelection honors an explicit empty selection", () => {
  assert.deepEqual(effectiveToolkitSelection([]), []);
});

test("effectiveToolkitSelection sanitizes provided arrays", () => {
  assert.deepEqual(
    effectiveToolkitSelection(["MetaAds", "notion"]),
    ["metaads", "notion"]
  );
});
