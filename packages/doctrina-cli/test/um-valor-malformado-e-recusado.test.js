// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseArgs, parsePositiveInt } from "../src/lib/args.js";
import { sinceWindow } from "../src/lib/metrics-model.js";

// A MALFORMED VALUE IS REFUSED, NOT REINTERPRETED.
//
// Three doors let a typo through as a different request:
//   - `metrics --since` handed free text to git, and git never refuses a
//     date: "abc" is NOW (an empty window, "nothing to measure", exit 0) and
//     "2026-13-45" some other day, echoed in the header as if it were valid;
//   - `parseInt` read "7x" as 7 and "1.5" as 1 for `report --since`,
//     `status --view report --since` and `context --budget`;
//   - `--budget -5` was parsed as a flag named "5", so the answer was
//     "unknown flag --5, did you mean --h?" instead of the range error.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-malformed-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  writeFileSync(path.join(dir, "a.txt"), "a\n");
  git("add", "-A");
  git("-c", "user.email=a@b", "-c", "user.name=a", "commit", "-qm", "feat: a");
  return dir;
}

test("a window git would misread is refused; the forms whose meaning is certain pass", () => {
  for (const bad of ["abc", "banana-day", "2026-13-45", "2026-02-30", "0", "7x", "0 days ago", "-3"]) {
    assert.equal(sinceWindow(bad), null, bad);
  }
  assert.equal(sinceWindow("30"), "30 days ago");
  assert.equal(sinceWindow("2026-02-28"), "2026-02-28");
  assert.equal(sinceWindow("3 months ago"), "3 months ago");
  assert.equal(sinceWindow("2  weeks  ago"), "2 weeks ago");
});

test("a count is digits above zero, not whatever parseInt salvages", () => {
  for (const bad of ["7x", "1.5", "100abc", "0", "-5", "", "1e3"]) assert.equal(parsePositiveInt(bad), null, bad);
  assert.equal(parsePositiveInt("7"), 7);
});

test("a negative number after a value-taking flag is that flag's value", () => {
  const { flags } = parseArgs(["core", "--budget", "-5"]);
  assert.equal(flags.get("budget"), "-5");
  assert.equal(flags.has("5"), false);
});

test("every door answers USAGE and names the value it refused", () => {
  const dir = project();
  try {
    const cases = [
      [["metrics", "--since", "abc"], /--since expects a day count/],
      [["metrics", "--since", "2026-13-45"], /got "2026-13-45"/],
      [["report", "--since", "7x"], /--since expects a positive day count, got "7x"/],
      [["report", "--since", "-3"], /got "-3"/],
      [["status", "--view", "report", "--since", "1.5"], /got "1.5"/],
      [["context", "--budget", "1.5"], /--budget expects a positive token count, got "1.5"/],
      [["context", "--budget", "-5"], /got "-5"/],
    ];
    for (const [args, message] of cases) {
      const r = runCli(args, dir);
      assert.equal(r.status, 2, `${args.join(" ")} — ${r.stdout}${r.stderr}`);
      assert.match(r.stderr, message, args.join(" "));
    }
    const ok = runCli(["metrics", "--since", "30"], dir);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /window: 30 days ago/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
