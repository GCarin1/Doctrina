// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE PERIOD DIGEST HAS ONE NAME: `status --view report`.
//
// `status` promised that its views "can never report different numbers",
// and `report` was said to be the same view under its own name. It was not:
// `report` passed the window's metrics to the renderer and `status --view
// report` did not, so in any repository with history the survivor printed
// the revert and re-edit rates two lines fewer. The earlier identity test
// ran where there is no history, which is the one place the two agreed.
//
// A merge is honest only when the survivor produces what the retiree did,
// so the proof runs WITH history, for the digest and the changelog draft.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function projectWithHistory() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-digest-"));
  const git = (...a) => spawnSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", ...a], { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  git("add", "-A");
  git("commit", "-qm", "feat: scaffold");
  writeFileSync(path.join(dir, "a.txt"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "fix: a");
  return dir;
}

test("status --view report prints what report printed, rates included", () => {
  const dir = projectWithHistory();
  try {
    for (const since of [[], ["--since", "30"]]) {
      const old = runCli(["report", ...since], dir);
      const now = runCli(["status", "--view", "report", ...since], dir);
      assert.equal(now.status, 0, now.stderr);
      assert.equal(now.stdout, old.stdout, `--since ${since[1] ?? "default"}`);
      assert.match(now.stdout, /reverts: 0/, "the metrics reach the survivor");
      assert.match(now.stdout, /re-edit rate/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("status --view agent-changelog prints what report --agent-changelog printed", () => {
  const dir = projectWithHistory();
  try {
    for (const since of [[], ["--since", "30"]]) {
      const old = runCli(["report", "--agent-changelog", ...since], dir);
      const now = runCli(["status", "--view", "agent-changelog", ...since], dir);
      assert.equal(now.status, 0, now.stderr);
      assert.equal(now.stdout, old.stdout);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report still works, warns on stderr, and names its survivor", () => {
  const dir = projectWithHistory();
  try {
    const r = runCli(["report"], dir);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /deprecated:.*doctrina status --view report/);
    assert.doesNotMatch(r.stdout, /deprecated/);
    assert.doesNotMatch(runCli(["status", "--view", "report"], dir).stderr, /deprecated/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
