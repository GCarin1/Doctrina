// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { sequence } from "../src/lib/gates.js";

// A GATE PLACED BEFORE THE STEP IT GUARDS CANNOT GUARD IT.
//
// The index-drift check already ran inside `verify` — and that is exactly why
// it missed. `verify` sits five steps before `archive`, and `archive` is the
// last step that WRITES the index, so the close certified an index that had
// not been written yet. Change 0138 closed green on a tree whose index had
// drifted; the commit shipped, and all six test legs of CI went red on the
// next push.
//
// `validate` cannot stand in for it: drift of that kind is only visible by
// rebuilding the index and comparing, which validate deliberately does not do.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function plannedChange() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-close-idx-"));
  spawnSync("git", ["init", "-q"], { cwd: tmp });
  spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
  spawnSync("git", ["config", "user.name", "t"], { cwd: tmp });
  run(tmp, ["init", "--non-interactive", "--project-name", "Acme",
    "--project-description", "A closing fixture"]);
  run(tmp, ["change", "new", "0001-uma", "a change"]);
  const dir = path.join(tmp, ".doctrina", "changes", "0001-uma");
  writeFileSync(path.join(dir, "proposal.md"), [
    "# Change 0001-uma — a change", "",
    "- **Status:** proposed",
    "- **Lane:** chore", "",
    "## Why", "", "A fixture that exercises the closing sequence.", "",
    "## What", "", "Nothing beyond existing with its sections written.", "",
    "## Scope boundaries", "", "Nothing.", "",
    "## Verification", "", "- [x] Automated checks pass.", "",
    "## Open questions", "", "None.", "",
  ].join("\n"));
  writeFileSync(path.join(dir, "tasks.md"), [
    "# Tasks — Change 0001-uma", "",
    "- [x] Exist with a real task.", "",
    "## Closing steps", "",
    "- [x] Apply.", "- [x] Archive.", "- [x] Index.", "",
  ].join("\n"));
  // Writing the proposal changes what the index recorded about it, which is
  // ordinary metadata drift and a different failure entirely. Settle it here,
  // so a test about ORDER is not measuring a stale title.
  run(tmp, ["index", "rebuild"]);
  return tmp;
}

test("the drift check is declared AFTER the step that rewrites the index", () => {
  const steps = sequence("close").map((/** @type {{id: string}} */ s) => s.id);
  const archive = steps.indexOf("archive");
  const drift = steps.indexOf("index-drift");
  assert.ok(archive >= 0, `the close must archive; got ${JSON.stringify(steps)}`);
  assert.ok(drift >= 0, "the close must check index drift");
  assert.ok(drift > archive,
    `the check must follow the write; got archive at ${archive} and drift at ${drift}`);
});

test("a close refuses to finish on an index that has drifted", () => {
  const tmp = plannedChange();
  try {
    // Drift the index the way an out-of-order incremental write used to: the
    // entries are all present and correct, only their ORDER disagrees with
    // what a rebuild produces. `validate` is blind to exactly this.
    const indexPath = path.join(tmp, ".doctrina", "index.json");
    // Order only: no entry is added, removed or altered, so every path still
    // resolves and every header still matches. That is precisely the shape the
    // old incremental writer produced, and precisely what validate cannot see.
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    run(tmp, ["spec", "new", "zebra"]);
    run(tmp, ["spec", "new", "alpha"]);
    const drifted = JSON.parse(readFileSync(indexPath, "utf8"));
    drifted.artifacts.specs = [...drifted.artifacts.specs].reverse();
    assert.notDeepEqual(drifted.artifacts.specs, index.artifacts.specs,
      "the fixture must actually reorder something");
    writeFileSync(indexPath, JSON.stringify(drifted, null, 2));

    // Precondition: validate is happy, which is the whole problem.
    assert.equal(run(tmp, ["validate"]).status, 0,
      "validate must stay blind to ordering drift — that is why the close needs its own step");

    const r = run(tmp, ["close", "0001-uma"]);
    assert.equal(r.status, 1, `the close must refuse:\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout + r.stderr, /index drift/,
      "the refusal must name the step that caught it");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a close finishes on a clean index", () => {
  const tmp = plannedChange();
  try {
    const r = run(tmp, ["close", "0001-uma"]);
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /closed/);
    // And what it just wrote is itself clean — the point of the step.
    assert.equal(run(tmp, ["index", "rebuild", "--check"]).status, 0,
      "a finished close must leave an index a rebuild agrees with");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
