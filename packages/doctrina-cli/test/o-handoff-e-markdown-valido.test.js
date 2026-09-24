// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { collectSnapshot } from "../src/lib/snapshot.js";
import { renderView } from "../src/lib/views.js";

// A HANDOFF IS PASTED, NOT READ IN THE TERMINAL.
//
// `handoff` and `report` exist to leave the terminal: the note goes into
// another session, the digest into an issue or a message. Whatever renders
// it there is a Markdown parser, and a parser needs a blank line before an
// ATX heading — glued to a list item above it, `## Next actions` is not a
// heading, it is more list text.
//
// One branch had it and the other did not: with an open change, the loop
// ended with a blank line; with none, "- none — the tree is at rest" ran
// straight into the next section. The state a note is WRITTEN in is exactly
// the state nobody proofreads, so the check is over the document, in both
// states, rather than over that one line.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-md-shape-"));
  const r = runCli(["init", "--non-interactive", "--project-name", "Acme"], dir);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return dir;
}

function openAChange(dir) {
  const id = "0001-uma-licao-aberta";
  const changeDir = path.join(dir, ".doctrina", "changes", id);
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(path.join(changeDir, "proposal.md"), [
    `# Change ${id} — uma lição aberta`, "",
    "- **Status:** proposed", "- **Date:** 2026-09-11", "- **Lane:** product", "",
    "## Why", "", "Porque sim.", "",
  ].join("\n"));
  writeFileSync(path.join(changeDir, "tasks.md"),
    `# Tasks — Change ${id}\n\n- [ ] fazer a coisa\n- [x] já feito\n`);
  runCli(["index", "rebuild"], dir);
}

// Fenced code is verbatim text: a "# " inside a fence is content, not a
// heading, and a shape check that ignores the fences invents failures.
function gluedHeadings(lines) {
  const bad = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    if (!/^#{1,6}\s/.test(line)) return;
    if (i === 0) return;
    if (lines[i - 1].trim() === "") return;
    bad.push(`line ${i + 1}: ${JSON.stringify(lines[i - 1])} then ${JSON.stringify(line)}`);
  });
  return bad;
}

// The checker has to be able to fail, or it proves nothing about the views.
test("the shape check catches a heading glued to the line above", () => {
  assert.deepEqual(gluedHeadings(["# Title", "", "- item", "## Next"]).length, 1);
  assert.deepEqual(gluedHeadings(["# Title", "", "- item", "", "## Next"]), []);
  assert.deepEqual(gluedHeadings(["# Title", "", "```", "# not a heading", "```"]), []);
});

const MARKDOWN_VIEWS = ["handoff", "report"];
const OPTS = { days: 7, cutoffIso: "2026-01-01", git: null };

test("every Markdown view renders valid headings on a tree at rest", () => {
  const dir = project();
  try {
    const snapshot = collectSnapshot(dir);
    for (const view of MARKDOWN_VIEWS) {
      const lines = renderView(view, snapshot, OPTS);
      assert.deepEqual(gluedHeadings(lines), [],
        `${view} on an empty tree — the state a handoff is usually written in`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every Markdown view renders valid headings with work open", () => {
  const dir = project();
  try {
    openAChange(dir);
    const snapshot = collectSnapshot(dir);
    for (const view of MARKDOWN_VIEWS) {
      const lines = renderView(view, snapshot, OPTS);
      assert.deepEqual(gluedHeadings(lines), [], `${view} with an open change`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Through the command, not only the view function: the note a person
// actually pastes is what the CLI wrote to stdout.
test("the handoff a person pastes is what the check passed", () => {
  const dir = project();
  try {
    const r = runCli(["handoff"], dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /^# Doctrina handoff/m);
    assert.deepEqual(gluedHeadings(r.stdout.split(/\r?\n/)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
