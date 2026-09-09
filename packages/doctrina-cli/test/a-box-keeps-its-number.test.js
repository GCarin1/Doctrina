import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseChecklist } from "../src/lib/doc-model.js";

// Change 0104 — os ordinais do tick são estáveis.
//
// `change tick` numbered the UNCHECKED boxes and renumbered after every
// tick. Measured in a clean project: `tick 1`, `tick 2`, `tick 3`, `tick 4`
// in four calls ticked task 1, then "Apply the change", "Update index.json"
// and "acceptance criteria are met" — the closing steps and the proposal's
// Verification claims — while tasks 2-4 stayed open. A box is a claim; the
// number that names it cannot move between two invocations.
//
// The second half: `* [ ] task` was not a box to the grammar, so `tick`
// could not tick it and the archive gate did not count it — an unchecked
// task that closed green.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-tick-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["change", "new", "0001-x", "X"]).status, 0);
  const tasksPath = path.join(dir, ".doctrina", "changes", "0001-x", "tasks.md");
  const tasks = readFileSync(tasksPath, "utf8")
    .replace(/- \[ \]\r?\n- \[ \]\r?\n- \[ \]\r?\n/, "- [ ] task one\n- [ ] task two\n* [ ] task three (star)\n+ [ ] task four (plus)\n");
  writeFileSync(tasksPath, tasks);
  return { dir, tasksPath };
}

test("every Markdown bullet marker opens a box", () => {
  const boxes = parseChecklist("- [ ] a\n* [x] b\n+ [ ] c\n  - [ ] d\n");
  assert.deepEqual(boxes.map((b) => [b.text, b.checked]), [["a", false], ["b", true], ["c", false], ["d", false]]);
});

test("the listing numbers every box, ticked or not, and the numbers do not move", () => {
  const { dir } = project();
  const before = run(dir, ["change", "tick", "0001-x"]).stdout;
  assert.match(before, /1\. \[ \] task one/);
  assert.match(before, /4\. \[ \] task four \(plus\)/);
  assert.match(before, /5\. \[ \] Apply the change/);
  assert.match(before, /8\. \[ \] Automated checks pass/);

  assert.equal(run(dir, ["change", "tick", "0001-x", "1"]).status, 0);
  const after = run(dir, ["change", "tick", "0001-x"]).stdout;
  assert.match(after, /1\. \[x\] task one/);
  assert.match(after, /2\. \[ \] task two/, "task two kept its number after task one was ticked");
  assert.match(after, /5\. \[ \] Apply the change/);
});

test("sequential ticks land on the boxes they name — never on the closing steps", () => {
  const { dir, tasksPath } = project();
  for (const n of ["1", "2", "3", "4"]) assert.equal(run(dir, ["change", "tick", "0001-x", n]).status, 0);
  const tasks = readFileSync(tasksPath, "utf8");
  assert.match(tasks, /- \[x\] task one/);
  assert.match(tasks, /- \[x\] task two/);
  assert.match(tasks, /\* \[x\] task three \(star\)/);
  assert.match(tasks, /\+ \[x\] task four \(plus\)/);
  assert.match(tasks, /- \[ \] Apply the change/, "the closing steps were not touched");
  const proposal = readFileSync(path.join(dir, ".doctrina", "changes", "0001-x", "proposal.md"), "utf8");
  assert.match(proposal, /- \[ \] Automated checks pass/, "the Verification claims were not touched");
});

test("a box already ticked is a named no-op, and a non-number names the argument", () => {
  const { dir } = project();
  assert.equal(run(dir, ["change", "tick", "0001-x", "1"]).status, 0);
  const again = run(dir, ["change", "tick", "0001-x", "1"]);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /box 1 is already ticked/);
  const bad = run(dir, ["change", "tick", "0001-x", "abc"]);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /no box "abc" \(a number 1\.\.9/);
  assert.doesNotMatch(bad.stderr, /NaN/);
});

test("--all ticks what is open, and a star-bullet box counts for the archive gate", () => {
  const { dir, tasksPath } = project();
  const tasks = readFileSync(tasksPath, "utf8")
    .replace("- [ ] task one", "- [x] task one").replace("- [ ] task two", "- [x] task two")
    .replace("+ [ ] task four (plus)", "+ [x] task four (plus)");
  writeFileSync(tasksPath, tasks);
  const check = run(dir, ["change", "check", "0001-x"]);
  assert.match(check.stdout, /unchecked task/, "the star-bullet box is an open task to the gate");
  assert.equal(run(dir, ["change", "tick", "0001-x", "--all"]).status, 0);
  assert.match(readFileSync(tasksPath, "utf8"), /\* \[x\] task three \(star\)/);
  assert.match(run(dir, ["change", "tick", "0001-x"]).stdout, /no unchecked boxes/);
});
