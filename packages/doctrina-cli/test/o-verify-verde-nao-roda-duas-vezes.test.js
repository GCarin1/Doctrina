// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync, readFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { worktreeFingerprint } from "../src/lib/git.js";

// A GREEN VERIFY DOES NOT RUN TWICE ON THE SAME CODE (change 0203).
//
// A field review of 0.17: the close of a small change cost 2.5–4 minutes,
// all of it the suite — which the agent had usually just run by hand, and
// which a batch close ran again for every id, on code that had not moved.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-reuse-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  const git = (/** @type {string[]} */ args) => execFileSync("git", args, { cwd: dir });
  git(["init", "-q"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  writeFileSync(path.join(dir, "app.js"), "export const a = 1;\n");
  writeFileSync(path.join(dir, ".gitignore"), "dist/\n");
  // The check counts its own runs, so a reuse is observable.
  writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({
    checks: [{ name: "count", run: "echo run >> runs.log" }],
  }));
  writeFileSync(path.join(dir, ".gitignore"), "dist/\nruns.log\n");
  git(["add", "-A"]);
  git(["commit", "-qm", "base"]);
  const runs = () => readFileSync(path.join(dir, "runs.log"), "utf8").split("\n").filter(Boolean).length;
  return { dir, run, runs };
}

test("the fingerprint is the code: .doctrina/ and ignored files do not move it, an edit or a new file does", () => {
  const { dir } = project();
  try {
    const fp = () => worktreeFingerprint(dir, { exclude: [".doctrina"] });
    const base = fp();
    assert.match(String(base), /^[0-9a-f]{64}$/);
    appendFileSync(path.join(dir, ".doctrina", "product.md"), "\nmore\n");
    writeFileSync(path.join(dir, "runs.log"), "ignored\n");
    assert.equal(fp(), base, "artifacts and ignored files are not the code");
    appendFileSync(path.join(dir, "app.js"), "// edit\n");
    const edited = fp();
    assert.notEqual(edited, base);
    writeFileSync(path.join(dir, "new.js"), "x\n");
    assert.notEqual(fp(), edited, "an untracked file is code too");
    // Reached through a symlink — macOS's tmpdir is one (`/var` → `/private/var`)
    // and git answers with the resolved path — the fingerprint is the same.
    const alias = path.join(mkdtempSync(path.join(os.tmpdir(), "doctrina-alias-")), "link");
    symlinkSync(dir, alias);
    assert.equal(worktreeFingerprint(alias, { exclude: [".doctrina"] }), fp());
    // The real index is untouched.
    assert.equal(execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: dir, encoding: "utf8" }), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verify --reuse skips only after a green run on byte-identical code", () => {
  const { dir, run, runs } = project();
  try {
    assert.equal(run(["verify"]).status, 0);
    assert.equal(runs(), 1);
    const reused = run(["verify", "--reuse"]);
    assert.equal(reused.status, 0);
    assert.match(reused.stdout, /reused the green run/);
    assert.equal(runs(), 1, "the check did not run again");
    // A plain verify always runs.
    assert.equal(run(["verify"]).status, 0);
    assert.equal(runs(), 2);
    // Code moved: everything runs.
    appendFileSync(path.join(dir, "app.js"), "// edit\n");
    assert.doesNotMatch(run(["verify", "--reuse"]).stdout, /reused/);
    assert.equal(runs(), 3);
    // A red run is never remembered.
    writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({
      checks: [{ name: "count", run: "echo run >> runs.log" }, { name: "red", run: "exit 1" }],
    }));
    assert.equal(run(["verify"]).status, 1);
    assert.equal(run(["verify", "--reuse"]).status, 1, "nothing green to reuse");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the close runs verify with --reuse", () => {
  const src = readFileSync(path.resolve(here, "..", "src", "commands", "close.js"), "utf8");
  assert.match(src, /verify\.run\(\[\], new Map\(\[\["reuse", true\]\]\)\)/);
});
