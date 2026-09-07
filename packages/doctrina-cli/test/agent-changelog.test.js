import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { draftAgentChangelog, renderDraft, draftWindow } from "../src/lib/agent-changelog.js";
import { AGENT_CHANGELOG_MAX_BULLETS } from "../src/lib/commands.js";
import { archivedLine, appendLedgerLine } from "../src/lib/ledger.js";

// Change 0048 — the agent changelog is drafted.
//
// `AGENT_CHANGELOG` is the block `upgrade --write` writes into AGENTS.md: at
// most five bullets telling an arriving agent what it must now DO. It is an
// object literal edited by hand at every release, and the comment above it
// already admits the approach "worked once and does not scale" (F22).
//
// The draft does not write it. It proposes candidates from the signals the
// docs gate already extracts per archived change, so the remembering is
// mechanical and the authorship stays human (ADR 0005).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// An archived change on disk plus its ledger line — the two records the
// draft joins: the ledger says what landed and when, the folder holds what
// the change said it touched.
function archive(dir, { id, date, title, body }) {
  const folder = path.join(dir, ".doctrina", "changes", "archive", `${date}-${id}`);
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "proposal.md"),
    `# Change ${id} — ${title}\n\n- **Status:** applied\n\n## Why\n\n${body}\n`);
  appendLedgerLine(dir, archivedLine(id, title, [{ capability: "cli", operation: "MODIFIED" }], date));
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-aclog-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

test("a change that touched no documented surface proposes nothing", () => {
  const dir = project();
  try {
    archive(dir, {
      id: "0001-internal", date: "2026-01-02", title: "move a helper into lib",
      body: "Pure refactor. Nothing an agent can observe changes.",
    });
    const draft = draftAgentChangelog(dir, { days: 3650 });
    assert.deepEqual(draft.candidates, []);
    assert.deepEqual(draft.silent.map((s) => s.id), ["0001-internal"]);
    // And it says so rather than printing an empty block.
    const text = renderDraft(draft, "1.0.0").join("\n");
    assert.match(text, /No archived change in this window touched a documented surface/);
    assert.doesNotMatch(text, /"1\.0\.0": \[/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a change that touched a command, a flag or an exit code proposes one bullet", () => {
  const dir = project();
  try {
    archive(dir, {
      id: "0002-surface", date: "2026-01-03", title: "work holds a runtime prompt",
      body: "`doctrina work` now exits 3 and points at `doctrina triage`; `--force` opens it anyway.",
    });
    const draft = draftAgentChangelog(dir, { days: 3650 });
    assert.equal(draft.candidates.length, 1);
    const [only] = draft.candidates;
    assert.equal(only.id, "0002-surface");
    assert.match(only.bullet, /work holds a runtime prompt/);
    assert.match(only.signals.join(" "), /commands: .*\btriage\b/);
    assert.match(only.signals.join(" "), /flags: .*--force/);
    assert.match(only.signals.join(" "), /exit codes/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the draft is newest first and stops at the block's cap", () => {
  // The cap is AGENTS.md's line budget, not a preference: the draft has to
  // respect the same ceiling the block is written under, and say what it
  // could not fit rather than drop it silently — which is the exact failure
  // the hand-edited block kept having.
  const dir = project();
  try {
    for (let i = 1; i <= AGENT_CHANGELOG_MAX_BULLETS + 3; i++) {
      archive(dir, {
        id: `00${i}0-surface`, date: `2026-01-${String(i).padStart(2, "0")}`,
        title: `change number ${i}`,
        body: "Adds `doctrina validate --frobnicate`.",
      });
    }
    const draft = draftAgentChangelog(dir, { days: 3650 });
    assert.equal(draft.candidates.length, AGENT_CHANGELOG_MAX_BULLETS);
    assert.equal(draft.truncated, 3);
    const dates = draft.candidates.map((cand) => cand.date);
    assert.deepEqual(dates, [...dates].sort().reverse(), "newest first");

    const text = renderDraft(draft, "0.16.0").join("\n");
    assert.match(text, /3 further candidates did not fit the 5-bullet cap/);
    assert.match(text, /choose, do not raise it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the window is named, whichever one it used", () => {
  // A draft that quietly covered the wrong period would be worse than one
  // that states its edges. With no tag to measure from, it says so.
  const dir = project();
  try {
    const auto = draftWindow(dir, {});
    assert.match(auto.basis, /no tag to measure from/);
    assert.match(auto.since, /^\d{4}-\d{2}-\d{2}$/);
    const explicit = draftWindow(dir, { days: 14 });
    assert.equal(explicit.basis, "the last 14 days");

    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["config", "user.email", "t@t"], { cwd: dir });
    spawnSync("git", ["config", "user.name", "t"], { cwd: dir });
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["commit", "-qm", "base"], { cwd: dir });
    spawnSync("git", ["tag", "v0.1.0"], { cwd: dir });
    const tagged = draftWindow(dir, {});
    assert.match(tagged.basis, /since the last tag/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report --agent-changelog prints the draft instead of the digest", () => {
  const dir = project();
  try {
    archive(dir, {
      id: "0003-surface", date: "2026-01-04", title: "a surface change",
      body: "Adds `doctrina validate --frobnicate`.",
    });
    const r = runCli(["report", "--agent-changelog", "--since", "3650"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /# Agent changelog draft for /);
    assert.match(r.stdout, /a surface change/);
    assert.match(r.stdout, /REWRITE each into what an agent must now DO/);
    // It replaces the digest — a different report for a different audience.
    assert.doesNotMatch(r.stdout, /## Gates/);

    // And the digest is untouched by the flag's absence.
    const digest = runCli(["report", "--since", "3650"], dir);
    assert.equal(digest.status, 0, digest.stderr);
    assert.match(digest.stdout, /## Gates/);
    assert.doesNotMatch(digest.stdout, /Agent changelog draft/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
