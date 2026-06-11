import { test } from "node:test";
import assert from "node:assert/strict";
import { today, slugify, padNumber } from "../src/lib/dates.js";

test("today returns YYYY-MM-DD for fixed Date", () => {
  const d = new Date(Date.UTC(2026, 5, 3)); // June 3, 2026 UTC
  assert.equal(today(d), "2026-06-03");
});

test("slugify lowercases, removes punctuation, hyphenates", () => {
  assert.equal(slugify("Adopt AGENTS.md Standard!"), "adopt-agents-md-standard");
  assert.equal(slugify("  trim me  "), "trim-me");
  assert.equal(slugify("multi   spaces"), "multi-spaces");
});

test("padNumber pads to width 4 by default", () => {
  assert.equal(padNumber(1), "0001");
  assert.equal(padNumber(42), "0042");
  assert.equal(padNumber(9999), "9999");
});
