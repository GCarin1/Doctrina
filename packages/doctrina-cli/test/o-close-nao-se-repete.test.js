// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE CLOSE SAYS EACH THING ONCE (change 0202).
//
// A field review of 0.17: every close "repeats the same 13 suggested
// skills". The close printed the whole `skill suggest` listing at the end of
// every close — per id in a batch — whether or not anything in it was new.
// And the docs step printed "touches no documented surface" twice, once for
// the docs and once for the changelog.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("a batch close prints one skills section: the fresh lesson by name, the rest as a count", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-once-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  const git = (/** @type {string[]} */ args) => execFileSync("git", args, { cwd: dir });
  try {
    git(["init", "-q"]);
    git(["config", "user.email", "t@example.com"]);
    git(["config", "user.name", "t"]);
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    writeFileSync(path.join(dir, "a.txt"), "a\n");
    git(["add", "-A"]);
    git(["commit", "-qm", "base"]);
    for (const n of [1, 2, 3]) {
      appendFileSync(path.join(dir, "a.txt"), `${n}\n`);
      git(["commit", "-qam", `fix: cloud crash on empty region ${n}`]);
    }
    const chore = (/** @type {string} */ id) => {
      assert.equal(run(["change", "new", id, `Change ${id}`, "--chore"]).status, 0, id);
      const changeDir = path.join(dir, ".doctrina", "changes", id);
      writeFileSync(path.join(changeDir, "tasks.md"), "# Tasks\n\n- [x] Did it\n");
      const proposal = path.join(changeDir, "proposal.md");
      writeFileSync(proposal, readFileSync(proposal, "utf8")
        .replace(/## Why\n\n[^\n]*\n/, "## Why\n\nThe parser crashed on empty input.\n")
        .replace(/## What\n\n<!--[^]*?-->/, "## What\n\nGuard the empty case."));
      assert.equal(run(["change", "tick", id, "--all"]).status, 0);
    };
    chore("0001-fix-parser-crash");
    chore("0002-rename-thing");

    const out = run(["close", "0001-fix-parser-crash", "0002-rename-thing"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.equal(out.stdout.split("──── skills (advisory)").length - 1, 1, "one section per run");
    assert.match(out.stdout, /fix-parser-crash is fix-shaped — capture the lesson while it is fresh: doctrina skill new /);
    assert.match(out.stdout, /3 older candidates waiting — `doctrina skill suggest`/);
    assert.doesNotMatch(out.stdout, /cloud-crash-on-empty-region-1/, "the waiting ones are a count, not a listing");
    // The docs step says it once.
    assert.doesNotMatch(out.stdout, /ok touches no documented surface\nok touches no documented surface/);

    // The full listing is still one command away.
    assert.match(run(["skill", "suggest"]).stdout, /cloud-crash-on-empty-region-1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
