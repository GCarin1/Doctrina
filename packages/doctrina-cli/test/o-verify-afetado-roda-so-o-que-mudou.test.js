// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// VERIFY --AFFECTED RUNS WHAT THE WORK TOUCHED (change 0204).
//
// A field review of 0.17 asked for "incremental verification: only the
// affected projects while working, the whole suite only at the final close".
// Doctrina cannot know which project a file belongs to — so the check says
// it, with the same "paths" a manual check's sign-off already declares.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("--affected runs a check only when the uncommitted work touches its paths; plain verify runs all", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-affected-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  const git = (/** @type {string[]} */ args) => execFileSync("git", args, { cwd: dir });
  try {
    git(["init", "-q"]);
    git(["config", "user.email", "t@example.com"]);
    git(["config", "user.name", "t"]);
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    for (const p of ["api", "web"]) {
      mkdirSync(path.join(dir, "packages", p), { recursive: true });
      writeFileSync(path.join(dir, "packages", p, "index.js"), "x\n");
    }
    writeFileSync(path.join(dir, ".gitignore"), "ran-*\n");
    writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({
      checks: [
        { name: "api", run: "touch ran-api", paths: ["packages/api"] },
        { name: "web", run: "touch ran-web", paths: ["packages/web"] },
        { name: "lint", run: "touch ran-lint" },
      ],
    }));
    git(["add", "-A"]);
    git(["commit", "-qm", "base"]);
    const ran = (/** @type {string} */ n) => { try { readFileSync(path.join(dir, `ran-${n}`)); return true; } catch { return false; } };
    const clear = () => { for (const n of ["api", "web", "lint"]) rmSync(path.join(dir, `ran-${n}`), { force: true }); };

    appendFileSync(path.join(dir, "packages", "api", "index.js"), "edit\n");
    const out = run(["verify", "--affected"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.ok(ran("api"), "its paths were touched");
    assert.ok(!ran("web"), "nothing under packages/web changed");
    assert.ok(ran("lint"), "a check with no paths covers everything");
    assert.match(out.stdout, /web: skip — the uncommitted work touches none of packages\/web/);
    assert.match(out.stdout, /2\/2 checks passed \(1 skipped by --affected: web\)/);

    // An untracked file counts as touched.
    clear();
    writeFileSync(path.join(dir, "packages", "web", "new.js"), "y\n");
    run(["verify", "--affected"]);
    assert.ok(ran("web"));

    // A partial run is never what --reuse stands on.
    clear();
    git(["checkout", "--", "."]);
    rmSync(path.join(dir, "packages", "web", "new.js"));
    run(["verify", "--affected"]);
    assert.doesNotMatch(run(["verify", "--reuse"]).stdout, /reused/);

    // Plain verify runs everything.
    clear();
    assert.equal(run(["verify"]).status, 0);
    assert.ok(ran("api") && ran("web") && ran("lint"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the close never runs verify with --affected", () => {
  const src = readFileSync(path.resolve(here, "..", "src", "commands", "close.js"), "utf8");
  assert.doesNotMatch(src, /\["affected"/);
});
