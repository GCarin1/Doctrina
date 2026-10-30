// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sliceSpec, adrDigest } from "../src/lib/context-slice.js";
import { terms } from "../src/lib/lexicon.js";

// THE READ PACK IS LEAN BY DEFAULT (change 0216).
//
// A field review: the agent skipped `context` and took `prime` as enough.
// Measured here, `context gates --concat` was ~40k tokens — AGENTS.md again,
// the whole spec, sixteen whole ADRs — and `--for` cut nothing below the
// 50k budget. Skipping it was the rational choice. Now the hub is not
// repeated, ADRs are digests, and `--for` slices the spec; `--full` restores.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const cliEntry = path.resolve(here, "..", "src", "index.js");
const pack = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, "context", ...args, "--concat"], {
  cwd: repoRoot, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
}).stdout;
const tokens = (/** @type {string} */ s) => Math.round(s.length / 4);

test("a task's pack on this repository fits in 10k tokens, and --full is the whole text", () => {
  const lean = pack(["gates", "--for", "verify reuse fingerprint"]);
  const whole = pack(["gates", "--for", "verify reuse fingerprint", "--full"]);
  assert.ok(tokens(lean) <= 10000, `lean pack is ~${tokens(lean)} tokens`);
  assert.ok(tokens(whole) >= 3 * tokens(lean), `--full (~${tokens(whole)}) restores the whole text`);
  assert.doesNotMatch(lean, /===== AGENTS\.md/, "the hub is not repeated");
  assert.match(whole, /===== AGENTS\.md/);
  assert.match(lean, /sliced for "verify reuse fingerprint" — \d+ of \d+ requirements and criteria kept/);
  assert.match(lean, /digest — full text: `doctrina show \d{4}`/);
  assert.match(lean, /When `verify --reuse` runs/, "the requirement the task is about survives the slice");
});

test("the slice keeps headers, Purpose and matching items, and names what it left out", () => {
  const spec = [
    "# Spec — auth", "", "**Version:** 0.1.0", "", "## Purpose", "", "Who may log in.", "",
    "## Requirements (EARS)", "", "### Ubiquitous", "", "- The system shall hash passwords.",
    "- The system shall expire a token", "  after one hour.", "- The system shall log logins.", "",
    "## Acceptance criteria", "", "1. [verified] a token expires — verified by `t`.", "2. [verified] logs — verified by `t`.", "",
    "## Out of scope", "", "Single sign-on.",
  ].join("\n");
  const r = sliceSpec(spec, terms("token expiry expire"), "x/spec.md");
  assert.ok(r);
  assert.match(r.text, /\*\*Version:\*\* 0\.1\.0/);
  assert.match(r.text, /Who may log in\./);
  assert.match(r.text, /- The system shall expire a token\n {2}after one hour\./, "an item keeps its continuation");
  assert.doesNotMatch(r.text, /hash passwords/);
  assert.equal(r.text.match(/… 1 not matching the task/g)?.length, 3, "each gap is named where it is — two requirements, one criterion");
  assert.match(r.text, /1\. \[verified\] a token expires/);
  assert.doesNotMatch(r.text, /Single sign-on/, "prose outside the lists is left out");
  assert.equal(sliceSpec(spec, terms("billing invoices"), "x"), null, "nothing matched: the spec stays whole");
});

test("an ADR digest is its title and the opening of its Decision", () => {
  const adr = "# ADR 0007 — Ops\n\n## Context\n\nLong.\n\n## Decision\n\nA delta carries an ops block.\n\n## Consequences\n\nMore.";
  const d = adrDigest(adr, "ADR 0007 — Ops", "0007");
  assert.match(d, /^# ADR 0007 — Ops\n\nA delta carries an ops block\./);
  assert.doesNotMatch(d, /Long\.|More\./);
  assert.match(d, /doctrina show 0007/);
});
