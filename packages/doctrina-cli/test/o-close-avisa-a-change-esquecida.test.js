// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { computeActions } from "../src/lib/actions.js";

// A FORGOTTEN CHANGE IS SAID OUT LOUD AT THE NEXT CLOSE (change 0201).
//
// A field review of 0.17: change 0078 was published but left open, and no
// later close mentioned it. `prime` and `next` did list it — and told the
// agent to run `change archive` by hand, the one path past verify, coverage
// and the docs gate that 0.17 had just retired in favour of `close`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function setup() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-forgotten-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  const open = (/** @type {string} */ id, /** @type {string} */ date, /** @type {boolean} */ done) => {
    assert.equal(run(["change", "new", id, `Title ${id}`]).status, 0);
    const dirOf = path.join(dir, ".doctrina", "changes", id);
    const proposal = path.join(dirOf, "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8").replace(/- \*\*Date:\*\* .*/, `- **Date:** ${date}`));
    if (done) writeFileSync(path.join(dirOf, "tasks.md"), "# Tasks\n\n- [x] Did it\n");
  };
  return { dir, run, open };
}

test("the close names the finished-but-open and the old changes, and counts the rest", () => {
  const { dir, run, open } = setup();
  try {
    const old = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
    const now = new Date().toISOString().slice(0, 10);
    open("0001-shipped", now, true);
    open("0002-ancient", old, false);
    open("0003-fresh", now, false);
    open("0004-target", now, false);
    // The target still has placeholder tasks, so its close stops at the
    // first step — the notice is printed whatever the close's outcome.
    const out = run(["close", "0004-target"]);
    assert.match(out.stdout, /other open changes \(advisory\) — 3/);
    assert.match(out.stdout, /0001-shipped: every task ticked, never closed.* — doctrina close 0001-shipped/);
    assert.match(out.stdout, /0002-ancient: still open, opened 20d ago/);
    assert.match(out.stdout, /1 more open and recent/);
    assert.doesNotMatch(out.stdout, /0004-target: /, "the change being closed is not 'another' change");

    const prime = run(["prime"]);
    assert.match(prime.stdout, /0002-ancient .*open 20d/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("next points an applied change and a delta-less change at the close, never at change archive", () => {
  const { dir, run } = setup();
  try {
    assert.equal(run(["change", "new", "0001-applied", "Applied"]).status, 0);
    const proposal = path.join(dir, ".doctrina", "changes", "0001-applied", "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8").replace(/- \*\*Status:\*\* .*/, "- **Status:** applied"));
    assert.equal(run(["change", "new", "0002-chore", "Chore"]).status, 0);
    writeFileSync(path.join(dir, ".doctrina", "changes", "0002-chore", "tasks.md"), "# Tasks\n\n- [x] Did it\n");

    const actions = computeActions(dir);
    const applied = actions.find((a) => a.args.includes("0001-applied"));
    const chore = actions.find((a) => a.args.includes("0002-chore"));
    assert.equal(applied?.command, "close");
    assert.equal(applied?.runnable, true);
    assert.equal(chore?.command, "close");
    const next = run(["next"]).stdout;
    assert.match(next, /doctrina close 0001-applied — applied but not archived/);
    assert.match(next, /close it as metadata-only: doctrina close 0002-chore/);
    assert.doesNotMatch(next, /change archive|change apply/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
