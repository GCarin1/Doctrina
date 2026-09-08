import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseChecklist, checklistProgress } from "../src/lib/doc-model.js";

// Change 0067 — one box count.
//
// The same boxes, the same tree, the same instant, counted three ways:
// `prime` said "tasks 0/3", `next` said "6 open tasks", `change tick` listed
// eight. The cause was not "some count the closing steps": `snapshot.js`
// required TEXT after the box, so the three empty placeholders `work`
// scaffolds were invisible to it — and the three it counted were the CLOSING
// STEPS, not the work. An agent reading `prime` saw "0/3" and believed there
// were three written tasks.
//
// Six regexes for one grammar, in six files. ADR 0021 again.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function changed() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-boxes-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "billing"]).status, 0);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  assert.equal(run(dir, ["work", "flag a duplicate credit", "--quiet"]).status, 0);
  const id = "0001-flag-duplicate-credit";
  return { dir, id };
}

// ------------------------------------------------------------- the counter

test("a scaffold placeholder is a box, and is marked as one", () => {
  const text = "# Tasks\n\n- [ ]\n- [x] written\n\n## Closing steps\n\n- [ ] Apply\n";
  const boxes = parseChecklist(text);
  assert.equal(boxes.length, 3);
  assert.deepEqual(boxes.map((b) => b.placeholder), [true, false, false]);
  assert.deepEqual(boxes.map((b) => b.checked), [false, true, false]);

  const p = checklistProgress(text);
  assert.equal(p.total, 3);
  assert.equal(p.done, 1);
  assert.equal(p.placeholders, 1);
});

test("a section can be counted on its own", () => {
  const text = "# Tasks\n\n- [ ] work\n\n## Closing steps\n\n- [ ] Apply\n- [x] Archive\n";
  assert.equal(checklistProgress(text).total, 3);
  const closing = checklistProgress(text, { section: "Closing steps" });
  assert.equal(closing.total, 2);
  assert.equal(closing.done, 1);
});

// ------------------------------------------------- the surfaces, side by side

test("prime, report, handoff and next report the same number of boxes", () => {
  const { dir, id } = changed();
  try {
    const tasks = readFileSync(path.join(dir, ".doctrina", "changes", id, "tasks.md"), "utf8");
    const real = checklistProgress(tasks).total;
    assert.ok(real >= 6, `the scaffold ships several boxes, got ${real}`);

    const prime = run(dir, ["prime"]).stdout;
    const report = run(dir, ["report"]).stdout;
    const handoff = run(dir, ["handoff"]).stdout;
    const next = run(dir, ["next"]).stdout;

    assert.match(prime, new RegExp(`tasks 0/${real}\\b`), prime);
    assert.match(report, new RegExp(`tasks 0/${real}\\b`), report);
    assert.match(handoff, new RegExp(`tasks: 0/${real} checked`), handoff);
    assert.match(next, new RegExp(`complete ${real} open tasks`), next);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("tick's ordinal space is the tasks plus the proposal's verification, and it says so", () => {
  const { dir, id } = changed();
  try {
    const base = path.join(dir, ".doctrina", "changes", id);
    const tasks = checklistProgress(readFileSync(path.join(base, "tasks.md"), "utf8")).total;
    const verif = checklistProgress(readFileSync(path.join(base, "proposal.md"), "utf8"),
      { section: "Verification" }).total;

    const out = run(dir, ["change", "tick", id]).stdout;
    const listed = out.split("\n").filter((l) => /^\s+\d+\.\s/.test(l)).length;
    assert.equal(listed, tasks + verif,
      `tick lists every unchecked box in both files:\n${out}`);
    assert.match(out, /\[tasks\.md\]/, out);
    assert.match(out, /\[proposal\.md ## Verification\]/, out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a placeholder is listed as one, not as a blank line", () => {
  const { dir, id } = changed();
  try {
    const out = run(dir, ["change", "tick", id]).stdout;
    assert.match(out, /scaffold placeholder/, out);
    const prime = run(dir, ["prime"]).stdout;
    assert.doesNotMatch(prime, /^\s+- \[ \]\s*$/m,
      "an unwritten task must be described, never printed as an empty box");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("counting is unchanged once every box is written and ticked", () => {
  const { dir, id } = changed();
  try {
    const p = path.join(dir, ".doctrina", "changes", id, "tasks.md");
    writeFileSync(p, readFileSync(p, "utf8").replace(/^- \[ \][ \t]*\r?$/gm, "- [ ] a real task"));
    const before = checklistProgress(readFileSync(p, "utf8"));
    assert.equal(before.placeholders, 0);
    assert.equal(before.done, 0);

    assert.equal(run(dir, ["change", "tick", id, "--all"]).status, 0);
    const after = checklistProgress(readFileSync(p, "utf8"));
    assert.equal(after.total, before.total);
    assert.equal(after.done, after.total);
    assert.match(run(dir, ["prime"]).stdout, new RegExp(`tasks ${after.total}/${after.total}`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no module outside the document model carries its own box regex", () => {
  const src = path.resolve(here, "..", "src");
  const walk = (d) => readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name))
      : (e.name.endsWith(".js") ? [path.join(d, e.name)] : [])));
  const offenders = [];
  for (const f of walk(src)) {
    if (f.endsWith(path.join("lib", "doc-model.js"))) continue;
    const text = readFileSync(f, "utf8");
    // A capture of the box state is the shape that means "counting boxes".
    for (const m of text.matchAll(/\\\[\(\[ xX\]\)\\\]/g)) {
      offenders.push(`${path.relative(src, f)}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [],
    `the box grammar has one owner (ADR 0021):\n  ${offenders.join("\n  ")}`);
});
