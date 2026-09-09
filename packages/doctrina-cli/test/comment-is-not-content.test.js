import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { commentRanges, isInsideComment, maskComments } from "../src/lib/doc-model.js";
import { documentedSurfaceSignals } from "../src/lib/docs-impact.js";
import { parseRequirements } from "../src/commands/show.js";
import { extractOps } from "../src/lib/spec-ops.js";

// Change 0055 — a comment is annotation, not content.
//
// Three readers of the same on-disk grammar disagreed about HTML comments.
// `extractOps` already skipped them; the docs gate and `show` did not, and
// each defect only showed up in a project that still had the scaffold's
// comments — which this repository's own specs no longer do. So every case
// below is built on a tree `init`/`spec new`/`work` actually produced, not
// on a hand-written fixture that would have hidden both bugs again.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-comment-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

test("maskComments blanks a comment without moving anything around it", () => {
  const text = "alpha\n<!-- hidden\n  - bullet -->\nomega\n";
  const masked = maskComments(text);
  assert.equal(masked.length, text.length, "offsets outside the comment must not move");
  assert.equal(masked.split("\n").length, text.split("\n").length, "line count must survive");
  assert.match(masked, /^alpha$/m);
  assert.match(masked, /^omega$/m);
  assert.doesNotMatch(masked, /hidden/);
  assert.doesNotMatch(masked, /^\s*-\s+bullet/m, "a bullet inside a comment stops being a bullet");
});

test("commentRanges and isInsideComment locate every comment by position", () => {
  const text = "a<!--x-->b<!--y-->c";
  const ranges = commentRanges(text);
  assert.equal(ranges.length, 2);
  assert.ok(isInsideComment(ranges, text.indexOf("x")));
  assert.ok(isInsideComment(ranges, text.indexOf("y")));
  assert.ok(!isInsideComment(ranges, text.indexOf("b")), "text between comments is content");
  assert.ok(!isInsideComment(ranges, text.indexOf("c")));
});

// A1 — the regression change 0044 introduced.
test("the guessed delta's RANKED GUESS note is not a documented-surface signal", () => {
  const dir = project();
  try {
    mkdirSync(path.join(dir, ".doctrina", "specs", "billing"), { recursive: true });
    writeFileSync(path.join(dir, ".doctrina", "specs", "billing", "spec.md"),
      "# Spec — billing\n\n**Capability:** billing\n**Status:** active\n" +
      "**Implementation:** planned\n**Realizes:** n/a — test\n**Version:** 0.1.0\n\n" +
      "## Purpose\n\nInvoices, invoice export, and billing statements.\n");
    assert.equal(runCli(["index", "rebuild"], dir).status, 0);

    const r = runCli(["work", "add an invoice export for customers", "--id", "0001-x", "--quiet"], dir);
    assert.equal(r.status, 0, r.stderr);

    const changeDir = path.join(dir, ".doctrina", "changes", "0001-x");
    const delta = readFileSync(path.join(changeDir, "specs", "billing", "delta.md"), "utf8");
    assert.match(delta, /RANKED GUESS/, "the guess mark is what this test is about — keep writing it");
    assert.match(delta, /doctrina work/, "and it still names the command, inside the comment");

    const signals = documentedSurfaceSignals(changeDir);
    assert.ok(!signals.some((s) => s.startsWith("commands:")),
      `a scaffolded change touches no documented surface, got: ${JSON.stringify(signals)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a command the author wrote outside a comment is still a signal", () => {
  const dir = project();
  try {
    const changeDir = path.join(dir, ".doctrina", "changes", "0002-y");
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(path.join(changeDir, "proposal.md"),
      "# Change 0002-y — y\n\n- **Status:** proposed\n\n## Why\n\n" +
      "`doctrina close` gains a `--dry-run` flag.\n");
    const signals = documentedSurfaceSignals(changeDir);
    assert.ok(signals.some((s) => s === "commands: close"), JSON.stringify(signals));
    assert.ok(signals.some((s) => s.includes("--dry-run")), JSON.stringify(signals));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A2 — numbering over a spec the CLI itself scaffolded.
test("show numbers requirements from the first authored bullet of a fresh spec", () => {
  const dir = project();
  try {
    assert.equal(runCli(["spec", "new", "invoicing"], dir).status, 0);
    const specPath = path.join(dir, ".doctrina", "specs", "invoicing", "spec.md");
    const scaffold = readFileSync(specPath, "utf8");
    assert.match(scaffold, /Easy Approach to Requirements Syntax/,
      "the scaffold's EARS legend is the whole point of this test — keep shipping it");

    const eol = scaffold.includes("\r\n") ? "\r\n" : "\n";
    writeFileSync(specPath, scaffold.replace(
      /^### Ubiquitous$/m,
      `### Ubiquitous${eol}${eol}- The system shall issue one invoice per order.`));

    const reqs = parseRequirements(readFileSync(specPath, "utf8"));
    assert.equal(reqs.length, 1, `only the authored bullet counts, got ${JSON.stringify(reqs)}`);
    assert.equal(reqs[0].section, "Ubiquitous");

    const r = runCli(["show", "invoicing-R1"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /The system shall issue one invoice per order\./);
    assert.doesNotMatch(r.stdout, /Ubiquitous:\s+The system shall <action>/,
      "R1 must not be the legend's first line");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("show reports the count of authored requirements, not of legend bullets", () => {
  const dir = project();
  try {
    assert.equal(runCli(["spec", "new", "chasing"], dir).status, 0);
    const r = runCli(["show", "chasing-R1"], dir);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /it declares 0\b/, r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The case that already obeyed the rule, now pinned against the shared owner.
test("extractOps still skips a fenced ops block that lives inside a comment", () => {
  const delta = [
    "# Spec Delta — capability: billing",
    "",
    "**Operation:** MODIFIED",
    "",
    "<!--",
    "For MODIFIED, prefer an ops block:",
    "",
    "```ops",
    "bump-version major",
    "```",
    "-->",
    "",
    "```ops",
    "bump-version minor",
    "```",
  ].join("\n");
  const ops = extractOps(delta);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].verb, "bump-version");
  assert.equal(ops[0].level, "minor", "the example inside the comment must never be the one executed");
});

test("an op value that legitimately contains a comment marker survives verbatim", () => {
  const delta = [
    "**Operation:** MODIFIED",
    "",
    "```ops",
    "append-criterion [unverified] the marker <!-- illustrative --> stays",
    "```",
  ].join("\n");
  const ops = extractOps(delta);
  assert.equal(ops.length, 1);
  assert.match(ops[0].value, /<!-- illustrative -->/,
    "masking is for scanning; applied values come from the raw text");
});
