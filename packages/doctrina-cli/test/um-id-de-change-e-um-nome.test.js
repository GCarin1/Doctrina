// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// A CHANGE IS NAMED BY ITS FOLDER, NEVER BY A PATH.
//
// `change new` validated its id (third audit), but every command that takes
// an EXISTING change joined the argument onto `.doctrina/changes/` and only
// asked whether something was there. `change archive ../../victim --force`
// moved the project's own `victim/` directory into the archive and wrote it
// into the ledger and the index (change 0196). Every reference is now a
// folder name — a legacy id outside the NNNN-slug grammar still resolves —
// and anything else is refused as USAGE before the filesystem is touched.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("no command that takes a change reference acts on a path outside .doctrina/changes/", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ref-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    mkdirSync(path.join(dir, "victim"));
    writeFileSync(path.join(dir, "victim", "proposal.md"), "# Change x — x\n\n## Why\n\nx\n");
    writeFileSync(path.join(dir, "victim", "important.txt"), "keep me\n");
    const ledger = path.join(dir, ".doctrina", "changes", "archive", "LEDGER.md");
    const before = existsSync(ledger) ? readFileSync(ledger, "utf8") : "";

    for (const argv of [
      ["change", "archive", "../../victim", "--force"],
      ["change", "apply", "../../victim", "--force"],
      ["change", "check", "../../victim"],
      ["change", "abandon", "../../victim", "--reason", "r"],
      ["change", "tick", "../../victim", "--all"],
      ["close", "../../victim", "--force"],
      ["analyze", "../../victim"],
      ["work", "--resume", "../../victim"],
      ["change", "archive", "archive", "--force"],
    ]) {
      const r = runCli(argv, dir);
      assert.equal(r.status, 2, `${argv.join(" ")} answered ${r.status}`);
      assert.match(r.stderr, /is not a change — a change is named by its folder/, argv.join(" "));
    }
    assert.equal(readFileSync(path.join(dir, "victim", "important.txt"), "utf8"), "keep me\n", "the directory stayed put");
    assert.equal(existsSync(ledger) ? readFileSync(ledger, "utf8") : "", before, "nothing was written to the ledger");
    assert.equal(runCli(["validate"], dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a legacy change id outside the NNNN-slug grammar still resolves", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ref-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const legacy = path.join(dir, ".doctrina", "changes", "Add_Login");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(path.join(legacy, "proposal.md"), "# Change Add_Login — add login\n\n## Why\n\nx\n");
    const r = runCli(["change", "check", "Add_Login"], dir);
    assert.doesNotMatch(r.stderr, /is not a change/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
