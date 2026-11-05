// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// CURSOR GETS SKILLS, AND THE GUARD FAILS CLOSED (change 0238).
//
// Cursor's documentation (read 2026-11-05) describes skills —
// `.cursor/skills/<name>/SKILL.md`, `name` matching the folder — and no
// longer `.cursor/commands/`; Cursor 2.4 converts slash commands to skills
// with `disable-model-invocation: true`. And Cursor lets an MCP call through
// when a hook crashes or cannot start unless the hook says `failClosed`, so
// a guard that could not run left a read-only tool writing, silently.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const CORE = ["context", "next", "status", "why", "work"];

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-cursor-skills-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  return { root, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

/** What the retired command held: the skill's body, without its frontmatter. */
const bodyOf = (/** @type {string} */ skill) => readFileSync(skill, "utf8").replace(/^---\n[\s\S]*?\n---\n+/, "");

test("the cursor adapter installs the core loop as skills Cursor discovers", () => {
  const s = sandbox();
  try {
    const dir = path.join(s.root, "p");
    mkdirSync(dir);
    s.run(dir, ["init", "--non-interactive", "--project-name", "p", "--agent", "cursor"]);
    assert.equal(existsSync(path.join(dir, ".cursor", "commands")), false, "no command Cursor no longer documents");
    for (const x of CORE) {
      const skill = readFileSync(path.join(dir, ".cursor", "skills", `doctrina-${x}`, "SKILL.md"), "utf8");
      const front = skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      assert.match(front, new RegExp(`^name: doctrina-${x}$`, "m"), "`name` matches the folder, as Cursor requires");
      assert.match(front, /^description: \S/m);
      assert.match(front, /^disable-model-invocation: true$/m, "explicit `/` invocation, as a migrated command keeps");
      assert.match(skill, new RegExp(`^# /doctrina-${x} — `, "m"));
    }
  } finally {
    s.done();
  }
});

test("upgrade moves an older install to the skills, and keeps an edited command", () => {
  const s = sandbox();
  try {
    const dir = path.join(s.root, "p");
    mkdirSync(dir);
    s.run(dir, ["init", "--non-interactive", "--project-name", "p", "--agent", "cursor"]);
    // The install as 0.20.0 left it: the commands, no skills.
    for (const x of CORE) {
      const skill = path.join(dir, ".cursor", "skills", `doctrina-${x}`, "SKILL.md");
      mkdirSync(path.join(dir, ".cursor", "commands"), { recursive: true });
      writeFileSync(path.join(dir, ".cursor", "commands", `doctrina-${x}.md`), bodyOf(skill));
      rmSync(path.dirname(skill), { recursive: true });
    }
    writeFileSync(path.join(dir, ".cursor", "commands", "doctrina-why.md"), "# my own why\n");
    const preview = s.run(dir, ["upgrade"]);
    assert.match(preview.out, /would {2}move 4 Cursor commands to \.cursor\/skills\//);
    const done = s.run(dir, ["upgrade", "--write"]);
    assert.match(done.out, /moved {3}5 adapter files to the skills the agent reads now, 4 retired copies removed/);
    assert.match(done.out, /kept {4}\.cursor\/commands\/doctrina-why\.md — edited since install/);
    for (const x of CORE) assert.ok(existsSync(path.join(dir, ".cursor", "skills", `doctrina-${x}`, "SKILL.md")), x);
    for (const x of ["context", "next", "status", "work"]) assert.equal(existsSync(path.join(dir, ".cursor", "commands", `doctrina-${x}.md`)), false, x);
    assert.equal(readFileSync(path.join(dir, ".cursor", "commands", "doctrina-why.md"), "utf8"), "# my own why\n", "an edit is never deleted");
    assert.doesNotMatch(s.run(dir, ["upgrade"]).out, /would {2}move/, "the move happens once");
  } finally {
    s.done();
  }
});

test("in a shadowed repository the skills go to the shadow and are linked in", () => {
  const s = sandbox();
  try {
    const api = path.join(s.root, "api");
    mkdirSync(api);
    spawnSync("git", ["init", "-q"], { cwd: api });
    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(s.root, "ws");
    s.run(ws, ["workspace", "add", "../api"]);
    const shadow = path.join(ws, "projects", "api");
    // Make the shadow look like a 0.20.0 one: commands, no skills.
    s.run(ws, ["workspace", "detach", "api"]);
    for (const x of CORE) {
      const skill = path.join(shadow, ".cursor", "skills", `doctrina-${x}`, "SKILL.md");
      mkdirSync(path.join(shadow, ".cursor", "commands"), { recursive: true });
      writeFileSync(path.join(shadow, ".cursor", "commands", `doctrina-${x}.md`), bodyOf(skill));
      rmSync(path.dirname(skill), { recursive: true });
    }
    s.run(ws, ["workspace", "attach", "api"]);
    assert.ok(lstatSync(path.join(api, ".cursor", "commands", "doctrina-work.md")).isSymbolicLink() || process.platform === "win32");
    const done = s.run(api, ["upgrade", "--write"]);
    assert.match(done.out, /moved {3}5 adapter files/, done.out);
    for (const x of CORE) {
      assert.ok(existsSync(path.join(shadow, ".cursor", "skills", `doctrina-${x}`, "SKILL.md")), `the shadow holds ${x}`);
      assert.ok(existsSync(path.join(api, ".cursor", "skills", `doctrina-${x}`, "SKILL.md")), `the repository reads ${x}`);
      assert.equal(existsSync(path.join(api, ".cursor", "commands", `doctrina-${x}.md`)), false, `no dangling link to ${x}`);
    }
    if (process.platform !== "win32") {
      assert.ok(lstatSync(path.join(api, ".cursor", "skills", "doctrina-work", "SKILL.md")).isSymbolicLink(), "a link, not a stray file in the repository");
    }
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: api, encoding: "utf8" }).stdout;
    assert.equal(status.trim(), "", `nothing of the shadow shows in the repository's git: ${status}`);
  } finally {
    s.done();
  }
});

test("with a tool declared the Cursor guard fails closed, and only then", () => {
  const s = sandbox();
  try {
    const api = path.join(s.root, "api");
    mkdirSync(api);
    spawnSync("git", ["init", "-q"], { cwd: api });
    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(s.root, "ws");
    s.run(ws, ["workspace", "add", "../api"]);
    const guard = (/** @type {string} */ file) => JSON.parse(readFileSync(file, "utf8")).hooks.beforeMCPExecution;
    const rootHooks = path.join(ws, ".cursor", "hooks.json");
    const shadowHooks = path.join(ws, "projects", "api", ".cursor", "hooks.json");
    assert.deepEqual(guard(rootHooks), [{ command: "doctrina workspace guard --hook cursor" }], "nothing declared: fail-open");
    s.run(ws, ["workspace", "tool", "jira"]);
    for (const file of [rootHooks, shadowHooks]) {
      assert.deepEqual(guard(file), [{ command: "doctrina workspace guard --hook cursor", failClosed: true }], `${file}: one entry, failing closed`);
    }
    s.run(ws, ["workspace", "tool", "jira", "--remove"]);
    assert.deepEqual(guard(rootHooks), [{ command: "doctrina workspace guard --hook cursor" }], "the last tool removed: fail-open again, never two entries");
  } finally {
    s.done();
  }
});
