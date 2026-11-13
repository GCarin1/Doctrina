// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { appendLine, read, write } from "../src/lib/fs-ops.js";
import { conflictMarkerLine } from "../src/lib/conflict-markers.js";
import { contended } from "../src/lib/lock.js";

// THE SEVENTH AUDIT: LINE ENDINGS, A MERGE THAT STOPPED, AND TWO COMMANDS AT
// ONCE (change 0250).
//
// Run as differential tests — the same project in LF and in CRLF must answer
// the same — a crash sweep of every operation (3,234 runs, no trace), and
// the edges of what 0.22 added. What it found:
//
//   - a CRLF checkout (Windows, `core.autocrlf`) read differently: a fresh
//     spec carried five EARS warnings, a diff showed the whole file changed,
//     and each rewrite left LF lines inside a CRLF file;
//   - `validate` answered "0 errors" on a spec holding git's conflict markers;
//   - eight `doctrina work` at once opened three changes numbered 0003, and
//     one stopped on a half-written index.json;
//   - `hooks install` crashed in a worktree and refused a project in a
//     subfolder of its repository, where `doctor` kept sending it;
//   - `--only` with no value silently removed a strict tool's list;
//   - `change renumber 0001-fix` rewrote a mention of `0001-fix-login`;
//   - the release could publish a commit that was not on main.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repo = path.resolve(here, "..", "..", "..");

function sandbox(prefix) {
  const root = mkdtempSync(path.join(os.tmpdir(), `doctrina-audit7-${prefix}-`));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const git = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" });
  const project = (/** @type {string} */ name, { repository = true } = {}) => {
    const dir = path.join(root, name);
    mkdirSync(dir, { recursive: true });
    if (repository) git(dir, ["init", "-q", "-b", "main"]);
    run(dir, ["init", "--non-interactive", "--project-name", path.basename(name)]);
    return dir;
  };
  return { root, env, run, git, project, done: () => rmSync(root, { recursive: true, force: true }) };
}

const crlf = (/** @type {string} */ file) => writeFileSync(file, readFileSync(file, "utf8").replace(/\r?\n/g, "\r\n"));
const endings = (/** @type {string} */ file) => {
  const text = readFileSync(file, "utf8");
  return { crlf: text.split("\r\n").length - 1, lf: text.replace(/\r\n/g, "").split("\n").length - 1 };
};

test("text is read with LF and written back with the ending the file has", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit7-eol-"));
  try {
    const win = path.join(dir, "win.md");
    writeFileSync(win, "﻿# Title\r\n\r\n- one\r\n");
    assert.equal(read(win), "# Title\n\n- one\n", "no mark, no carriage return: one grammar for every checkout");
    write(win, read(win) + "- two\n", { force: true });
    assert.equal(readFileSync(win, "utf8"), "# Title\r\n\r\n- one\r\n- two\r\n", "the rewrite keeps the file's ending");
    appendLine(win, "- three");
    assert.match(readFileSync(win, "utf8"), /- two\r\n- three\r\n$/);

    const unix = path.join(dir, "unix.md");
    writeFileSync(unix, "a\n");
    write(unix, "a\r\nb\r\n", { force: true });
    assert.equal(readFileSync(unix, "utf8"), "a\r\nb\r\n", "an LF file is written as given: only CRLF is something to keep");
    write(path.join(dir, "new.md"), "x\r\n");
    assert.equal(readFileSync(path.join(dir, "new.md"), "utf8"), "x\r\n", "a new file is written as given");
    const index = path.join(dir, "index.json");
    writeFileSync(index, "{}\n");
    write(index, "{\"a\":1}\n", { force: true, atomic: true });
    assert.equal(readFileSync(index, "utf8"), "{\"a\":1}\n");
    assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith(".tmp")), [], "the atomic write leaves nothing behind");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a CRLF project validates as its LF twin, and a cycle leaves no mixed endings", () => {
  const s = sandbox("crlf");
  try {
    const dir = s.project("p");
    s.run(dir, ["spec", "new", "links"]);
    s.run(dir, ["decision", "new", "Codes are base62"]);
    writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({ checks: [{ name: "ok", run: "node -e 0" }] }));
    const spec = path.join(dir, ".doctrina", "specs", "links", "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8").replace(/^1\. .*$/m, "1. [verified] It exists — verified by `.doctrina/verify.json`."));
    s.run(dir, ["index", "rebuild"]);
    const before = s.run(dir, ["validate"]).out;
    for (const rel of ["AGENTS.md", ".doctrina/specs/links/spec.md", ".doctrina/product.md", ".doctrina/decisions/0001-codes-are-base62.md"]) crlf(path.join(dir, rel));
    assert.equal(s.run(dir, ["validate"]).out, before, "the five EARS warnings a CRLF scaffold used to carry are gone");
    assert.doesNotMatch(before, /missing "shall"/);

    s.run(dir, ["work", "Create a link", "--title", "create", "--capability", "links", "--quiet"]);
    const change = path.join(dir, ".doctrina", "changes", "0001-create");
    const proposal = path.join(change, "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8").replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## What\n\nAn endpoint.\n"));
    const tasks = path.join(change, "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/(- \[ \]\r?\n){3}/, "- [ ] Add it.\n"));
    for (const f of [proposal, tasks]) crlf(f);
    s.run(dir, ["change", "delta", "0001-create", "links", "--bump", "minor", "--requirement", "event: When a URL is posted, the system shall answer a code."]);
    crlf(path.join(change, "specs", "links", "delta.md"));
    s.run(dir, ["change", "delta", "0001-create", "links", "--criterion", "[verified] A URL answers a code — verified by `.doctrina/verify.json`."]);
    assert.equal(endings(path.join(change, "specs", "links", "delta.md")).lf, 0, "ops added to a CRLF delta are CRLF");
    assert.doesNotMatch(s.run(dir, ["change", "check", "0001-create", "--verbose"]).out, /^-# Spec — links/m, "the preview is a diff of what changes, not of every line");
    s.run(dir, ["change", "tick", "0001-create", "--all"]);
    const closed = s.run(dir, ["close", "0001-create"]);
    assert.equal(closed.status, 0, closed.out);

    const archived = path.join(dir, ".doctrina", "changes", "archive", String(readdirSync(path.join(dir, ".doctrina", "changes", "archive")).find((d) => d.endsWith("0001-create"))));
    for (const file of [spec, path.join(archived, "proposal.md"), path.join(archived, "tasks.md"), path.join(dir, ".doctrina", "decisions", "0001-codes-are-base62.md")]) {
      assert.equal(endings(file).lf, 0, `${path.basename(file)} is still CRLF throughout`);
    }
    assert.match(readFileSync(spec, "utf8"), /shall answer a code\.\r\n/);
    assert.match(readFileSync(path.join(archived, "proposal.md"), "utf8"), /- \*\*Status:\*\* applied\r\n- \*\*Applied:\*\* /, "the stamp landed, in the file's ending");
    assert.equal(s.run(dir, ["index", "rebuild", "--check"]).status, 0);
  } finally {
    s.done();
  }
});

test("a spec a merge stopped in is an error, and the first thing next names", () => {
  assert.equal(conflictMarkerLine("a\n<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> bob\n"), 2);
  assert.equal(conflictMarkerLine("Title\n=======\n\ntext\n"), null, "a setext underline is not a conflict");
  assert.equal(conflictMarkerLine("```\n<<<<<<< HEAD\n=======\n>>>>>>> bob\n```\n"), null, "markers shown as an example are not one");
  const s = sandbox("conflict");
  try {
    const dir = s.project("p");
    s.run(dir, ["spec", "new", "auth"]);
    const spec = path.join(dir, ".doctrina", "specs", "auth", "spec.md");
    const clean = readFileSync(spec, "utf8");
    writeFileSync(spec, clean.replace("### Event-driven\n", "### Event-driven\n\n<<<<<<< HEAD\n- When alice asks, the system shall answer.\n=======\n- When bob asks, the system shall answer.\n>>>>>>> bob\n"));
    const validate = s.run(dir, ["validate"]);
    assert.equal(validate.status, 1, validate.out);
    assert.match(validate.out, /error: \.doctrina\/specs\/auth\/spec\.md:\d+ carries git's merge conflict markers/);
    assert.match(s.run(dir, ["next"]).out, /1\. resolve the merge conflict in \.doctrina\/specs\/auth\/spec\.md \(line \d+\)/);
    writeFileSync(spec, clean);
    assert.doesNotMatch(s.run(dir, ["validate"]).out, /conflict markers/);
  } finally {
    s.done();
  }
});

test("indexing a change waits for the lock another command holds, and a holder may take it again", async () => {
  const s = sandbox("index-lock");
  try {
    const dir = s.project("p");
    assert.equal(s.run(dir, ["work", "--chore", "first", "--title", "first", "--quiet"]).status, 0);
    const indexFile = path.join(dir, ".doctrina", "index.json");
    const before = readFileSync(indexFile, "utf8");
    // Another command holds the lock; this one re-indexes the change under it.
    const lockDir = path.join(dir, ".doctrina", ".lock");
    mkdirSync(lockDir);
    const lib = path.resolve(path.dirname(cliEntry), "lib");
    const child = spawn(process.execPath, ["--input-type=module", "-e",
      `const { reindexChange } = await import(${JSON.stringify(pathToFileURL(path.join(lib, "change-ops.js")).href)}); reindexChange(process.argv[1], "0001-first", "2099-01-01");`, dir], { env: s.env });
    const ended = new Promise((resolve) => child.on("close", resolve));
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(readFileSync(indexFile, "utf8"), before, "nothing is written while another command holds the lock");
    rmdirSync(lockDir);
    assert.equal(await ended, 0);
    assert.match(readFileSync(indexFile, "utf8"), /"last_updated": "2099-01-01"/, "written once the lock is free");
    assert.equal(existsSync(lockDir), false, "and released");

    // Re-entered by its own holder: `work` opens a change under the lock and indexes it.
    const { withProjectLock } = await import(pathToFileURL(path.join(lib, "lock.js")).href);
    const started = Date.now();
    assert.equal(withProjectLock(dir, () => withProjectLock(dir, () => "inner")), "inner");
    assert.ok(Date.now() - started < 1000, "the holder does not wait for itself");
    assert.equal(existsSync(lockDir), false);
  } finally {
    s.done();
  }
});

test("a lock directory Windows is still deleting is contention, not a tree with nothing to serialise", () => {
  assert.equal(contended("EEXIST", "linux"), true);
  assert.equal(contended("EEXIST", "win32"), true);
  for (const code of ["EPERM", "EACCES", "EBUSY"]) {
    assert.equal(contended(code, "win32"), true, `${code} on Windows is a removal still pending: wait for it`);
    assert.equal(contended(code, "linux"), false, `${code} on POSIX is a tree the lock cannot be written in`);
  }
  assert.equal(contended("ENOENT", "win32"), false, "no .doctrina/: nothing to serialise");
});

test("commands run at once number their changes apart and never read half an index", async () => {
  const s = sandbox("parallel");
  try {
    const dir = s.project("p");
    const runs = await Promise.all(Array.from({ length: 8 }, (_v, i) => new Promise((resolve) => {
      const child = spawn(process.execPath, [cliEntry, "work", "--chore", `task ${i}`, "--title", `t${i}`, "--quiet"], { cwd: dir, env: s.env });
      let out = "";
      child.stdout.on("data", (d) => { out += d; });
      child.stderr.on("data", (d) => { out += d; });
      child.on("close", (code) => resolve({ code, out }));
    })));
    for (const r of runs) assert.equal(r.code, 0, r.out);
    const opened = readdirSync(path.join(dir, ".doctrina", "changes")).filter((d) => /^\d{4}-/.test(d));
    assert.equal(opened.length, 8);
    assert.equal(new Set(opened.map((d) => d.slice(0, 4))).size, 8, `eight changes, eight numbers: ${opened.join(" ")}`);
    assert.equal(JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8")).artifacts.changes.length, 8, "none lost from the index");
    assert.equal(existsSync(path.join(dir, ".doctrina", ".lock")), false, "the lock is released");
    assert.doesNotMatch(s.run(dir, ["validate"]).out, /shares its number/);
  } finally {
    s.done();
  }
});

test("hooks install works in a worktree and for a project below its repository's root", () => {
  const s = sandbox("hooks");
  try {
    const main = s.project("main");
    s.git(main, ["add", "-A"]);
    s.git(main, ["commit", "-qm", "base"]);
    s.git(main, ["worktree", "add", "-q", path.join(s.root, "wt"), "-b", "feat"]);
    const inWorktree = s.run(path.join(s.root, "wt"), ["hooks", "install"]);
    assert.equal(inWorktree.status, 0, inWorktree.out);
    assert.ok(existsSync(path.join(main, ".git", "hooks", "pre-commit")), "where git keeps this worktree's hooks");

    const mono = path.join(s.root, "mono");
    mkdirSync(mono);
    s.git(mono, ["init", "-q", "-b", "main"]);
    const api = s.project("mono/services/api", { repository: false });
    const below = s.run(api, ["hooks", "install"]);
    assert.equal(below.status, 0, below.out);
    assert.match(readFileSync(path.join(mono, ".git", "hooks", "pre-commit"), "utf8"), /^cd "services\/api" \|\| exit 1$/m, "git runs the hook from the root");
    assert.ok(existsSync(path.join(api, ".gitattributes")));
    assert.match(s.run(api, ["doctor"]).out, /ok {4}merges/);
    // The staged check reads this project's index, not one at the root.
    s.git(mono, ["add", "-A"]);
    assert.match(s.run(api, ["index", "rebuild", "--check", "--staged"]).out, /the staged index matches the staged tree/);
    const commit = s.git(mono, ["commit", "-qm", "with the hook"]);
    assert.equal(commit.status, 0, commit.stdout + commit.stderr);

    const none = path.join(s.root, "none");
    mkdirSync(path.join(none, ".git"), { recursive: true });
    s.run(none, ["init", "--non-interactive", "--project-name", "none"]);
    const refused = s.run(none, ["hooks", "install"]);
    assert.equal(refused.status, 3, "a folder named .git is not a repository");
    assert.equal(existsSync(path.join(none, ".gitattributes")), false, "and nothing was written before the refusal");
  } finally {
    s.done();
  }
});

test("--only with no value is refused, and renumber leaves a longer id alone", () => {
  const s = sandbox("edges");
  try {
    const repoDir = path.join(s.root, "api");
    mkdirSync(repoDir);
    s.git(repoDir, ["init", "-q"]);
    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(s.root, "ws");
    s.run(ws, ["workspace", "add", "../api"]);
    s.run(ws, ["workspace", "tool", "jira", "--only", "getJiraIssue"]);
    const bare = s.run(ws, ["workspace", "tool", "jira", "--only"]);
    assert.equal(bare.status, 2, bare.out);
    assert.match(bare.out, /--only needs the calls it allows/);
    assert.deepEqual(JSON.parse(readFileSync(path.join(ws, "workspace.json"), "utf8")).tools[0].only, ["getJiraIssue"], "the list is still there");

    const dir = s.project("p");
    s.run(dir, ["work", "--chore", "fix", "--id", "0001-fix", "--quiet"]);
    s.run(dir, ["work", "--chore", "fix login", "--id", "0001-fix-login", "--quiet"]);
    const proposal = path.join(dir, ".doctrina", "changes", "0001-fix", "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8") + "\nSee 0001-fix-login; this is 0001-fix.\n");
    assert.match(s.run(dir, ["change", "renumber", "0001-fix"]).out, /renumbered 0001-fix → 0002-fix/);
    assert.match(readFileSync(path.join(dir, ".doctrina", "changes", "0002-fix", "proposal.md"), "utf8"), /See 0001-fix-login; this is 0002-fix\./);
  } finally {
    s.done();
  }
});

test("a Python project is seeded with the linter and the type checker it declares", () => {
  const s = sandbox("python");
  try {
    const dir = path.join(s.root, "ledger");
    mkdirSync(path.join(dir, "app"), { recursive: true });
    mkdirSync(path.join(dir, "tests"));
    writeFileSync(path.join(dir, "pyproject.toml"), "[tool.poetry]\nname = \"ledger\"\n[tool.poetry.dependencies]\nfastapi = \"^0.115\"\n[tool.poetry.group.dev.dependencies]\npytest = \"^8\"\nruff = \"^0.6\"\n[tool.mypy]\nstrict = true\n");
    writeFileSync(path.join(dir, "poetry.lock"), "");
    writeFileSync(path.join(dir, "app", "main.py"), "x = 1\n");
    writeFileSync(path.join(dir, "tests", "test_main.py"), "def test_x(): assert True\n");
    s.run(dir, ["init", "--non-interactive", "--project-name", "ledger"]);
    s.run(dir, ["intake", "--from-code"]);
    const seeded = s.run(dir, ["verify", "--init"]).out;
    assert.match(seeded, /poetry run ruff check \., poetry run mypy \., poetry run pytest/, seeded);
    const checks = JSON.parse(readFileSync(path.join(dir, ".doctrina", "verify.json"), "utf8")).checks.map((/** @type {{name: string}} */ c) => c.name);
    assert.deepEqual(checks, ["lint", "typecheck", "test"]);

    const bare = path.join(s.root, "bare");
    mkdirSync(path.join(bare, "tests"), { recursive: true });
    writeFileSync(path.join(bare, "pyproject.toml"), "[project]\nname = \"bare\"\ndependencies = [\"pytest\"]\n");
    writeFileSync(path.join(bare, "tests", "test_a.py"), "def test_a(): assert True\n");
    s.run(bare, ["init", "--non-interactive", "--project-name", "bare"]);
    s.run(bare, ["intake", "--from-code"]);
    assert.doesNotMatch(readFileSync(path.join(bare, ".doctrina", "intake.md"), "utf8"), /ruff|mypy/, "nothing the project does not declare");
  } finally {
    s.done();
  }
});

test("the examples and this repository still read the same after the door changed", () => {
  // The read rule is global, so the proof is global: the tree this suite
  // lives in validates, and its index is the one a rebuild derives.
  const r = spawnSync(process.execPath, [cliEntry, "index", "rebuild", "--check"], { cwd: repo, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
