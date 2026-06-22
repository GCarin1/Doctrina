import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractOps,
  applyOps,
  setHeader,
  bumpVersion,
  setCriterionMark,
  replaceCriterion,
  appendCriterion,
} from "../src/lib/spec-ops.js";

const SPEC = [
  "# Spec — billing",
  "",
  "**Capability:** billing",
  "**Status:** active",
  "**Implementation:** partial",
  "**Last updated:** 2026-06-20",
  "**Version:** 0.2.0",
  "",
  "## Acceptance criteria",
  "",
  "1. [unverified] Charges a card — verified by `test/charge.test.ts`.",
  "2. [verified] Issues a refund — verified by `test/refund.test.ts`.",
  "",
  "## Out of scope",
  "",
  "- nothing",
  "",
].join("\n");

test("extractOps parses a fenced ops block, ignoring comments and blanks", () => {
  const delta = [
    "# Spec Delta — capability: billing",
    "",
    "**Operation:** MODIFIED",
    "",
    "---",
    "",
    "Prose explaining the change.",
    "",
    "```ops",
    "# this is a comment",
    "set-header Implementation: verified — done",
    "",
    "bump-version minor",
    "set-criterion 1: verified",
    "```",
    "",
  ].join("\n");
  const ops = extractOps(delta);
  assert.equal(ops.length, 3);
  assert.deepEqual(ops[0], { verb: "set-header", name: "Implementation", value: "verified — done" });
  assert.deepEqual(ops[1], { verb: "bump-version", level: "minor" });
  assert.deepEqual(ops[2], { verb: "set-criterion", n: 1, value: "verified" });
});

test("extractOps returns [] when there is no ops block", () => {
  assert.deepEqual(extractOps("# delta\n\nprose only, merge by hand\n"), []);
});

test("extractOps does not mistake a normal code fence for ops", () => {
  const delta = "```js\nconst x = 1;\n```\n";
  assert.deepEqual(extractOps(delta), []);
});

test("setHeader replaces a dash-optional header and errors when absent", () => {
  const r = setHeader(SPEC, "Implementation", "verified — durable");
  assert.match(r.text, /^\*\*Implementation:\*\* verified — durable$/m);
  const dash = setHeader("- **Status:** proposed\n", "Status", "applied");
  assert.match(dash.text, /^- \*\*Status:\*\* applied$/m);
  const missing = setHeader(SPEC, "Owner", "alice");
  assert.match(missing.error, /no "\*\*Owner:\*\*" header/);
});

test("bumpVersion increments semver and rejects non-semver", () => {
  assert.match(bumpVersion(SPEC, "minor").text, /^\*\*Version:\*\* 0\.3\.0$/m);
  assert.match(bumpVersion(SPEC, "major").text, /^\*\*Version:\*\* 1\.0\.0$/m);
  assert.match(bumpVersion(SPEC, "patch").text, /^\*\*Version:\*\* 0\.2\.1$/m);
  assert.match(bumpVersion("**Version:** latest\n", "minor").error, /not semver/);
});

test("setCriterionMark flips an existing [mark] and inserts one when absent", () => {
  const flipped = setCriterionMark(SPEC, 1, "verified");
  assert.match(flipped.text, /1\. \[verified\] Charges a card/);
  const noMark = setCriterionMark("## Acceptance criteria\n\n1. Plain criterion.\n", 1, "verified");
  assert.match(noMark.text, /1\. \[verified\] Plain criterion\./);
  const missing = setCriterionMark(SPEC, 9, "verified");
  assert.match(missing.error, /no criterion #9/);
});

test("replaceCriterion swaps prose and keeps the numbering", () => {
  const r = replaceCriterion(SPEC, 2, "[verified] Refund within 5s — `test/refund.test.ts`.");
  assert.match(r.text, /2\. \[verified\] Refund within 5s/);
  assert.ok(!r.text.includes("Issues a refund"));
});

test("appendCriterion adds the next number after the last criterion", () => {
  const r = appendCriterion(SPEC, "[unverified] Emits a receipt — `test/receipt.test.ts`.");
  assert.match(r.text, /3\. \[unverified\] Emits a receipt/);
  // It is inserted inside the section, before the next heading.
  const idx3 = r.text.indexOf("3. [unverified]");
  const idxOut = r.text.indexOf("## Out of scope");
  assert.ok(idx3 < idxOut, "new criterion must stay inside the section");
});

test("applyOps runs a sequence and reports a clean summary", () => {
  const ops = extractOps(
    "```ops\nset-header Implementation: verified — done\nbump-version minor\nset-criterion 1: verified\n```\n",
  );
  const r = applyOps(SPEC, ops);
  assert.equal(r.errors.length, 0, r.errors.join("; "));
  assert.equal(r.applied.length, 3);
  assert.match(r.text, /\*\*Implementation:\*\* verified — done/);
  assert.match(r.text, /\*\*Version:\*\* 0\.3\.0/);
  assert.match(r.text, /1\. \[verified\] Charges a card/);
});

test("applyOps collects errors and leaves the spec otherwise intact", () => {
  const ops = extractOps(
    "```ops\nset-header Nope: x\nbogus-verb whatever\nset-criterion 2: verified\n```\n",
  );
  const r = applyOps(SPEC, ops);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /no "\*\*Nope:\*\*" header/);
  assert.match(r.errors[1], /unknown operation "bogus-verb"/);
  // The valid op still applied.
  assert.match(r.text, /2\. \[verified\] Issues a refund/);
});
