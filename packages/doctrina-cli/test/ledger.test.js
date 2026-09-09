import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, appendFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  parseLedger, readLedger, churnByCapability, appendLedgerLine,
  archivedLine, abandonedLine, forcedLine, docsGapLine, ledgerPath,
} from "../src/lib/ledger.js";
import { dependentsOf } from "../src/lib/scan.js";

// Change 0046 — the ledger becomes a readable source.
//
// `LEDGER.md` records, per line, the date, the change id, the title and the
// capabilities that change touched with the operation performed on each. It
// is the only place the project writes down what moved in terms of
// CAPABILITIES; `metrics` derives everything from git, which knows about
// files. For two releases exactly two things read it — an id set in
// `decision scope` and a cross-check in `validate` — each with its own regex
// (audit findings F13, F14).
//
// The parse is deliberately tolerant: the file's own header invites humans to
// edit it and promises the CLI only appends. A line outside the grammar is a
// person writing a note, not a corrupt ledger.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("this repository's own ledger parses, every line of it", () => {
  // The real file, not a fixture: 50-odd entries written by three different
  // code paths across four months, including the abandonments.
  const { exists, entries, unparsed } = readLedger(repoRoot);
  assert.equal(exists, true);
  assert.ok(entries.length > 40, `only ${entries.length} entries parsed`);
  assert.equal(unparsed, 0, "no entry line in the shipped ledger may fail the grammar");
  assert.ok(entries.some((e) => e.kind === "abandoned"), "the abandonments must be recognised as such");
  assert.ok(entries.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date)));
  assert.ok(entries.every((e) => e.id.length > 0));
});

test("each kind of line the CLI writes is read back as what it is", () => {
  const text = [
    archivedLine("0001-x", "a title", [{ capability: "cli", operation: "MODIFIED" }, { capability: "gates", operation: "ADDED" }], "2026-01-02"),
    abandonedLine("0002-y", "superseded by 0003", "2026-01-03"),
    forcedLine("0003-z", "archive", [{ gate: "verification", message: "2 unchecked tasks" }], "2026-01-04"),
    docsGapLine("0004-w", ["--json flag"], "2026-01-05"),
  ].join("\n");
  const { entries, unparsed } = parseLedger(text);
  assert.equal(unparsed, 0);
  assert.deepEqual(entries.map((e) => e.kind), ["archived", "abandoned", "gap", "gap"]);
  assert.equal(entries[0].title, "a title");
  assert.deepEqual(entries[0].specs, [
    { capability: "cli", operation: "MODIFIED" },
    { capability: "gates", operation: "ADDED" },
  ]);
  // The title never swallows the specs list, and the specs never leak into it.
  assert.doesNotMatch(entries[0].title, /specs:/);
});

test("a hand-written line is ignored, not fatal", () => {
  // The contract the file states about itself: "edit freely, the CLI only
  // appends". A parser that threw on prose would make that promise false.
  const text = [
    "# Change ledger",
    "",
    "Some notes a person left here.",
    "- and a bullet they typed by hand",
    "- 2026-13-45 — bad-date — not a date at all",
    archivedLine("0001-x", "a real one", [{ capability: "cli", operation: "MODIFIED" }], "2026-01-02"),
  ].join("\n");
  const { entries, unparsed } = parseLedger(text);
  assert.equal(entries.length, 1, "only the well-formed line is an entry");
  assert.equal(entries[0].id, "0001-x");
  assert.equal(unparsed, 2, "the bullets that are not entries are counted, not thrown");
});

test("churn counts landed changes per capability, and nothing else", () => {
  const entries = parseLedger([
    archivedLine("0001", "a", [{ capability: "cli", operation: "MODIFIED" }], "2026-01-01"),
    archivedLine("0002", "b", [{ capability: "cli", operation: "MODIFIED" }, { capability: "gates", operation: "MODIFIED" }], "2026-02-01"),
    abandonedLine("0003", "", "2026-02-02"),
    forcedLine("0004", "archive", [{ gate: "verification", message: "x" }], "2026-02-03"),
  ].join("\n")).entries;

  assert.deepEqual(churnByCapability(entries), [
    { capability: "cli", changes: 2, last: "2026-02-01" },
    { capability: "gates", changes: 1, last: "2026-02-01" },
  ]);
  // A window cuts by date, inclusive.
  assert.deepEqual(churnByCapability(entries, { since: "2026-02-01" }), [
    { capability: "cli", changes: 1, last: "2026-02-01" },
    { capability: "gates", changes: 1, last: "2026-02-01" },
  ]);
  // An abandoned change touched nothing and a waived gate is not a spec edit,
  // so neither can inflate the count.
  assert.equal(churnByCapability(entries).reduce((n, r) => n + r.changes, 0), 3);
});

test("the ledger has one writer: archive and abandon go through it", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ledger-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    assert.equal(runCli(["spec", "new", "billing"], dir).status, 0);

    // A change that lands.
    assert.equal(runCli(["change", "new", "0001-x", "A real change"], dir).status, 0);
    // Real tasks, because `change tick` refuses scaffold placeholders — the
    // hollow-change teeth. This is the ordinary path, not the forced one.
    const changeDir = path.join(dir, ".doctrina", "changes", "0001-x");
    const tasksPath = path.join(changeDir, "tasks.md");
    writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replace(/^- \[ \]\s*$/gm, "- [ ] do the thing"));
    const proposalPath = path.join(changeDir, "proposal.md");
    writeFileSync(proposalPath, readFileSync(proposalPath, "utf8")
      .replace(/(## Why\r?\n\r?\n)<!--[\s\S]*?-->/, "$1Because the ledger must record it.")
      .replace(/(## What\r?\n\r?\n)<!--[\s\S]*?-->/, "$1One delta on billing."));
    const deltaDir = path.join(dir, ".doctrina", "changes", "0001-x", "specs", "billing");
    mkdirSync(deltaDir, { recursive: true });
    writeFileSync(path.join(deltaDir, "delta.md"),
      "# Spec Delta — capability: billing\n\n**Operation:** MODIFIED\n" +
      "**Target spec on apply:** `.doctrina/specs/billing/spec.md`\n\n---\n\nbody\n");
    assert.equal(runCli(["change", "tick", "0001-x", "--all"], dir).status, 0);
    assert.equal(runCli(["change", "archive", "0001-x"], dir).status, 0);

    // And one that is discarded.
    assert.equal(runCli(["change", "new", "0002-y", "A discarded change"], dir).status, 0);
    assert.equal(runCli(["change", "abandon", "0002-y", "--force", "--reason", "not needed"], dir).status, 0);

    const { entries, unparsed } = readLedger(dir);
    assert.equal(unparsed, 0);
    assert.deepEqual(entries.map((e) => [e.id, e.kind]), [["0001-x", "archived"], ["0002-y", "abandoned"]]);
    assert.deepEqual(entries[0].specs, [{ capability: "billing", operation: "MODIFIED" }]);
    assert.match(entries[1].title, /not needed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the first line creates the file, header and all", () => {
  // A forced transition can happen before anything has ever been archived,
  // and a gap unrecorded because the file did not exist yet is the silence
  // the ledger exists to break.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ledger-new-"));
  try {
    mkdirSync(path.join(dir, ".doctrina", "changes", "archive"), { recursive: true });
    rmSync(path.join(dir, ".doctrina", "changes", "archive"), { recursive: true, force: true });
    appendLedgerLine(dir, archivedLine("0001-x", "first ever", [], "2026-01-01"));
    const text = readFileSync(ledgerPath(dir), "utf8");
    assert.match(text, /^# Change ledger/);
    assert.match(text, /the CLI only appends/);
    assert.equal(readLedger(dir).entries.length, 1);

    // And a second line appends rather than rewrites.
    appendLedgerLine(dir, archivedLine("0002-y", "second", [], "2026-01-02"));
    assert.equal(readLedger(dir).entries.length, 2);
    assert.equal((readFileSync(ledgerPath(dir), "utf8").match(/# Change ledger/g) ?? []).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report shows capability churn for the period", () => {
  const out = runCli(["report", "--since", "3650"], repoRoot).stdout;
  assert.match(out, /## Capability churn \(in period\)/);
  assert.match(out, /- cli: \d+ changes? \(last \d{4}-\d{2}-\d{2}\)/);
  // A narrow window may legitimately hold nothing; what must never happen is
  // the section claiming a count it did not derive from the ledger.
  const { entries } = readLedger(repoRoot);
  const top = churnByCapability(entries)[0];
  assert.match(out, new RegExp(`- ${top.capability}: ${top.changes} changes?`));
});

test("review reports churn as history, never as a finding", () => {
  const out = runCli(["review", "--diff", "HEAD~2"], repoRoot).stdout;
  if (!/landed \d+ changes in the last/.test(out)) return; // window may be empty
  assert.match(out, /history, not a verdict/);
  // It is a note (`!`), never a break (`✗`).
  for (const line of out.split("\n")) {
    if (/landed \d+ changes in the last/.test(line)) assert.match(line, /^\s*!/);
  }
});

test("dependents are derived once, from the Depends on header", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-deps-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    for (const [cap, deps] of [["core", null], ["billing", "core"], ["reporting", "billing, core"]]) {
      assert.equal(runCli(["spec", "new", cap], dir).status, 0);
      if (!deps) continue;
      const p = path.join(dir, ".doctrina", "specs", cap, "spec.md");
      const text = readFileSync(p, "utf8").replace(/(\*\*Status:\*\*)/, `**Depends on:** ${deps}\n$1`);
      writeFileSync(p, text);
    }
    assert.deepEqual(dependentsOf(dir, ["core"]), [
      { capability: "billing", dependsOn: ["core"] },
      { capability: "reporting", dependsOn: ["core"] },
    ]);
    // A capability is never its own dependent, and an untouched pair is silent.
    assert.deepEqual(dependentsOf(dir, ["reporting"]), []);
    assert.deepEqual(dependentsOf(dir, []), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
