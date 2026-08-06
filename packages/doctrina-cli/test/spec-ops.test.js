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
  appendRequirement,
  replaceRequirement,
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

test("extractOps skips an example block inside a comment without mutating real op values", () => {
  // Two halves of one guard. The scaffolded template carries an EXAMPLE ops
  // block inside its instructional comment, which apply must never execute.
  // But the comment must be skipped BY POSITION: stripping comment text
  // first corrupted an op whose own value contains a comment — an
  // `<!-- illustrative -->` marker reached the spec with the marker gutted.
  const delta = [
    "# Spec Delta — capability: docs",
    "",
    "**Operation:** MODIFIED",
    "",
    "<!--",
    "For MODIFIED, prefer an ops block:",
    "```ops",
    "bump-version major",
    "```",
    "-->",
    "",
    "---",
    "",
    "```ops",
    "append-criterion [verified] Output blocks carry an `<!-- illustrative -->` marker — `test/x.test.js`.",
    "```",
    "",
  ].join("\n");

  const ops = extractOps(delta);
  assert.equal(ops.length, 1, "the commented example must not be executed");
  assert.equal(ops[0].verb, "append-criterion");
  assert.match(ops[0].value, /<!-- illustrative -->/, "the op's own comment must survive verbatim");
  assert.ok(!ops.some((o) => o.verb === "bump-version"), "the example op must not leak through");
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

// A spec with the full EARS section layout, as `spec new` scaffolds it —
// including the lone "-" placeholder bullets the requirement verbs must
// replace rather than append after.
const EARS_SPEC = [
  "# Spec — billing",
  "",
  "**Version:** 0.2.0",
  "",
  "## Requirements (EARS)",
  "",
  "### Ubiquitous",
  "",
  "- The system shall record every charge.",
  "- The system shall use ISO currency codes.",
  "",
  "### Event-driven",
  "",
  "- When a card is declined, the system shall retry once.",
  "",
  "### State-driven",
  "",
  "-",
  "",
  "### Unwanted-behavior (must-not)",
  "",
  "- The system shall not double-charge.",
  "",
  "### Optional",
  "",
  "-",
  "",
  "## Acceptance criteria",
  "",
  "1. [unverified] Charges a card — verified by `test/charge.test.ts`.",
  "",
].join("\n");

test("extractOps parses the EARS requirement verbs", () => {
  const ops = extractOps([
    "```ops",
    "append-requirement event: When a refund lands, the system shall email a receipt.",
    "replace-requirement ubiquitous 2: The system shall use ISO 4217 currency codes.",
    "```",
  ].join("\n"));
  assert.equal(ops.length, 2);
  assert.deepEqual(ops[0], { verb: "append-requirement", section: "event", value: "When a refund lands, the system shall email a receipt." });
  assert.deepEqual(ops[1], { verb: "replace-requirement", section: "ubiquitous", n: 2, value: "The system shall use ISO 4217 currency codes." });
  // Section aliases fold to the canonical token; unknown sections error.
  assert.equal(extractOps("```ops\nappend-requirement unwanted-behavior: The system shall not leak keys.\n```")[0].section, "unwanted");
  assert.match(extractOps("```ops\nappend-requirement misc: x\n```")[0].error, /unknown section "misc"/);
});

test("appendRequirement appends after the last bullet and replaces a lone placeholder", () => {
  const appended = appendRequirement(EARS_SPEC, "event", "When a chargeback opens, the system shall freeze the account.");
  const evIdx = appended.text.indexOf("### Event-driven");
  const newIdx = appended.text.indexOf("When a chargeback opens");
  const stateIdx = appended.text.indexOf("### State-driven");
  assert.ok(evIdx < newIdx && newIdx < stateIdx, "new bullet must land inside Event-driven");
  // The scaffold's lone "-" is replaced, not appended after.
  const placeholder = appendRequirement(EARS_SPEC, "state", "While in maintenance, the system shall queue charges.");
  assert.match(placeholder.text, /- While in maintenance, the system shall queue charges\./);
  const stateBlock = placeholder.text.slice(placeholder.text.indexOf("### State-driven"), placeholder.text.indexOf("### Unwanted"));
  assert.ok(!/^-$/m.test(stateBlock), "placeholder bullet must be gone");
  assert.match(appendRequirement("# spec\n\nno sections\n", "event", "x").error, /no '## Requirements/);
});

test("append verbs insert after a wrapped item's continuation lines, never inside it", () => {
  // The 0.13.0 dogfood close caught this on the repo's own cli spec: the
  // last bullet/criterion wrapped over indented continuation lines, and the
  // append landed between the first line and its continuation.
  const spec = [
    "## Requirements (EARS)",
    "",
    "### Event-driven",
    "",
    "- When the first thing happens, the system shall",
    "  do the documented effect over two lines.",
    "",
    "## Acceptance criteria",
    "",
    "1. [verified] A wrapped criterion — proven by",
    "   `test/wrapped.test.js` on its continuation line.",
    "",
  ].join("\n");
  const req = appendRequirement(spec, "event", "When Y happens, the system shall do Z.");
  const reqLines = req.text.split("\n");
  const contIdx = reqLines.indexOf("  do the documented effect over two lines.");
  assert.equal(reqLines[contIdx - 1], "- When the first thing happens, the system shall",
    "continuation must stay attached to its bullet");
  assert.equal(reqLines[contIdx + 1], "- When Y happens, the system shall do Z.");

  const crit = appendCriterion(spec, "[unverified] New — verified by `t.js`.");
  const critLines = crit.text.split("\n");
  const proofIdx = critLines.indexOf("   `test/wrapped.test.js` on its continuation line.");
  assert.equal(critLines[proofIdx + 1], "2. [unverified] New — verified by `t.js`.",
    "new criterion must come after the previous criterion's continuation");
});

test("replaceRequirement swaps the nth real bullet and bounds-checks", () => {
  const r = replaceRequirement(EARS_SPEC, "ubiquitous", 2, "The system shall use ISO 4217 codes.");
  assert.match(r.text, /- The system shall use ISO 4217 codes\./);
  assert.ok(!r.text.includes("ISO currency codes"), "old bullet must be replaced");
  assert.match(replaceRequirement(EARS_SPEC, "event", 5, "x").error, /has 1 requirement, no #5/);
});

test("applyOps runs criteria and requirement verbs together", () => {
  const ops = extractOps([
    "```ops",
    "bump-version minor",
    "append-requirement optional: Where a wallet is linked, the system may skip 3DS.",
    "append-criterion [unverified] Wallet skip works — verified by `test/wallet.test.ts`.",
    "```",
  ].join("\n"));
  const r = applyOps(EARS_SPEC, ops);
  assert.equal(r.errors.length, 0, r.errors.join("; "));
  assert.match(r.text, /\*\*Version:\*\* 0\.3\.0/);
  assert.match(r.text, /- Where a wallet is linked, the system may skip 3DS\./);
  assert.match(r.text, /2\. \[unverified\] Wallet skip works/);
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
