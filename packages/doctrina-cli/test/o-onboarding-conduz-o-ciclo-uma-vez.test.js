// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE CYCLE ONCE, ON THE REAL REPOSITORY (change 0256).
//
// A newcomer had a 2,900-line reference and `next`, which names one action
// and assumes the reader knows why. `onboard` reads where the project
// stands and prints the walk: what each step is for, what to run, what to
// tell the human and where to ask. Every tick is read from the tree.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const env = { ...process.env, NO_COLOR: "1" };

function repository() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-onboard-"));
  spawnSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  const run = (/** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  return { dir, run, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const current = (/** @type {string} */ out) => out.match(/^ {2}→ (\d)\. (.+)$/m)?.slice(1, 3).join(" ") ?? null;

test("before init the first step is the install, and nothing is written", () => {
  const p = repository();
  try {
    const r = p.run(["onboard"]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^Doctrina onboarding — the whole cycle once, on this repository/);
    assert.equal(current(r.out), "1 Install");
    assert.match(r.out, /Step 1 — Install\n {2}Tell the human: Doctrina keeps what the system should do in `\.doctrina\/`/);
    assert.match(r.out, /Run:\n {4}doctrina init\n/);
    assert.equal(existsSync(path.join(p.dir, ".doctrina")), false);
  } finally {
    p.done();
  }
});

test("the description step names the door the repository needs", () => {
  const p = repository();
  try {
    const init = p.run(["init", "--non-interactive", "--project-name", "links"]);
    assert.match(init.out, /New to Doctrina\? `doctrina onboard` walks the whole cycle once, on this repository\./);
    const empty = p.run(["onboard"]);
    assert.equal(current(empty.out), "2 Describe the project");
    assert.match(empty.out, /✓ 1\. Install {24}\.doctrina\/ and AGENTS\.md are here/);
    assert.match(empty.out, /ASK the human for the project in a paragraph[^\n]*\n {2}Then run:\n {4}doctrina intake --text "<what the project is, in a paragraph>"/);

    writeFileSync(path.join(p.dir, "app.py"), "def shorten(u):\n    return u\n");
    const code = p.run(["onboard"]);
    assert.match(code.out, /ASK the human what the code cannot tell[^\n]*\n {2}Then run:\n {4}doctrina intake --from-code/);
    assert.match(code.out, /After it: step 3, pick a first task and open it/);
  } finally {
    p.done();
  }
});

test("the first task is suggested from the repository, and each step ticks when the tree shows it", () => {
  const p = repository();
  try {
    p.run(["init", "--non-interactive", "--project-name", "links"]);
    writeFileSync(path.join(p.dir, ".doctrina", "verify.json"), JSON.stringify({ checks: [{ name: "ok", run: "node -e 0" }] }));
    writeFileSync(path.join(p.dir, "app.py"), "def shorten(u):\n    # TODO: handle expired links before returning the code\n    return u\n");
    writeFileSync(path.join(p.dir, "notes.md"), "TODO: this is prose, not code — never a candidate\n");
    p.run(["spec", "new", "codes"]);
    const spec = path.join(p.dir, ".doctrina", "specs", "codes", "spec.md");
    const text = readFileSync(spec, "utf8");
    const at = text.indexOf("## Acceptance criteria");
    const after = text.indexOf("\n## ", at + 5);
    writeFileSync(spec, `${text.slice(0, at)}## Acceptance criteria\n\n1. [unverified] Two URLs get two codes.\n2. [verified] It exists — verified by \`app.py\`.\n${after < 0 ? "" : text.slice(after)}`);
    p.run(["index", "rebuild"]);

    const pick = p.run(["onboard"]);
    assert.equal(current(pick.out), "3 Pick a first task and open it");
    assert.match(pick.out, /✓ 2\. Describe the project {11}1 capability spec \(codes\)/);
    assert.match(pick.out, /Candidates read from this repository:\n {4}- codes #1 {17}no proof cited: Two URLs get two codes\.\n {4}- app\.py:2 {17}TODO handle expired links before returning the code\n/);
    assert.doesNotMatch(pick.out, /notes\.md|It exists/, "prose is not code, and a proven criterion is not a task");
    assert.match(pick.out, /ASK the human to choose one of the candidates, or to name a small task of their own/);
    assert.match(pick.out, /Not every edit is a change — the tracks, by what a request changes:\n {2}direct {2}nothing a spec says/);
    const json = JSON.parse(p.run(["onboard", "--json"]).stdout);
    assert.equal(json.current, "first-task");
    assert.deepEqual(json.candidates.map((/** @type {any} */ c) => `${c.kind} ${c.where}`), ["criterion codes #1", "todo app.py:2"]);
    assert.deepEqual(json.steps.map((/** @type {any} */ s) => s.done), [true, true, false, false, false, false]);

    // Open it: the walk moves on by itself, naming the change.
    const id = String(p.run(["work", "--chore", "handle expired links", "--title", "expired links", "--quiet"]).out.match(/opened (\d{4}-[a-z0-9-]+)/)?.[1]);
    const plan = p.run(["onboard"]);
    assert.equal(current(plan.out), "4 Write the delta and the tasks");
    assert.match(plan.out, new RegExp(`✓ 3\\. Pick a first task and open it {2}${id} is open`));
    assert.match(plan.out, new RegExp(`Run:\\n {4}doctrina work --resume ${id} {4}# the playbook\\n {4}doctrina change check ${id}[^\\n]*\\n {2}Then ASK the human whether the requirement you wrote is what they meant`));
    assert.doesNotMatch(plan.out, /Candidates read/);

    const change = path.join(p.dir, ".doctrina", "changes", id);
    writeFileSync(path.join(change, "tasks.md"), readFileSync(path.join(change, "tasks.md"), "utf8").replace(/(- \[ \]\r?\n){3}/, "- [ ] Refuse an expired link.\n"));
    writeFileSync(path.join(change, "proposal.md"), readFileSync(path.join(change, "proposal.md"), "utf8")
      .replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## What\n\nAn expired link is refused.\n"));
    const implement = p.run(["onboard"]);
    assert.equal(current(implement.out), "5 Implement and prove");
    assert.match(implement.out, new RegExp(`doctrina change tick ${id} <n>\\n {4}doctrina verify`));

    p.run(["change", "tick", id, "--all"]);
    const close = p.run(["onboard"]);
    assert.equal(current(close.out), "6 Close");
    assert.match(close.out, new RegExp(`Run:\\n {4}doctrina close ${id}`));

    // The work itself: the criterion that had no proof now cites one.
    writeFileSync(spec, readFileSync(spec, "utf8").replace("1. [unverified] Two URLs get two codes.", "1. [verified] Two URLs get two codes — verified by `app.py`."));
    p.run(["index", "rebuild"]);
    const closed = p.run(["close", id]);
    assert.equal(closed.status, 0, closed.out);
    const tour = p.run(["onboard"]);
    assert.equal(current(tour.out), null, "every step is ticked");
    assert.match(tour.out, /✓ 6\. Close {26}1 change closed — the last at \.doctrina\/changes\/archive\/\d{4}-\d{2}-\d{2}-\d{4}-expired-links\//);
    assert.match(tour.out, /The cycle has run here — 1 change closed\. For someone new to the project:/);
    assert.match(tour.out, /doctrina why codes +# why a capability exists/);
    assert.match(tour.out, /\.doctrina\/changes\/archive\/[^\n]*-expired-links\/proposal\.md {4}# a finished change, start to end/);
    assert.equal(JSON.parse(p.run(["onboard", "--json"]).stdout).current, null);
  } finally {
    p.done();
  }
});

test("upgrade gives an installed adapter the skill a newer CLI ships, and no adapter the project never added", () => {
  const p = repository();
  try {
    p.run(["init", "--non-interactive", "--project-name", "links"]);
    assert.doesNotMatch(p.run(["upgrade"]).out, /adapter file/, "no adapter installed: nothing to add");
    p.run(["adapter", "add", "cursor"]);
    const skill = path.join(p.dir, ".cursor", "skills", "doctrina-onboard", "SKILL.md");
    assert.match(readFileSync(skill, "utf8"), /^---\nname: doctrina-onboard\n[\s\S]*Run `doctrina onboard`/);
    rmSync(path.dirname(skill), { recursive: true });

    const preview = p.run(["upgrade"]);
    assert.match(preview.out, /would {2}add 1 adapter file this CLI ships now: \.cursor\/skills\/doctrina-onboard\/SKILL\.md/);
    assert.equal(existsSync(skill), false, "the preview writes nothing");
    assert.match(p.run(["upgrade", "--write"]).out, /added {3}1 adapter file this CLI ships now: \.cursor\/skills\/doctrina-onboard\/SKILL\.md/);
    assert.match(readFileSync(skill, "utf8"), /name: doctrina-onboard/);
    assert.equal(existsSync(path.join(p.dir, ".claude", "commands", "doctrina-onboard.md")), false, "claude was never added here");
    assert.doesNotMatch(p.run(["upgrade"]).out, /adapter file/);
  } finally {
    p.done();
  }
});
