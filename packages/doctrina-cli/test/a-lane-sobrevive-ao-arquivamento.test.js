// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE LANE A CHANGE WAS BORN IN OUTLIVES ITS ARCHIVING.
//
// Change 0042 recorded the lane in the proposal so a report could answer
// "what kind of work did this period hold?". The index carried it for an
// OPEN change only: `change archive` and the rebuild each built the archived
// entry by hand, neither with the lane, so the report's Lanes section read
// "unknown: 163" over a history where 138 proposals named their lane
// (change 0192).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const archived = (dir) => JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8"))
  .artifacts.changes_archive;

test("an archived chore keeps its lane in the index, by archive and by rebuild, and the report counts it", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-lane-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    assert.equal(runCli(["work", "Bump the lockfile", "--chore", "--quiet"], dir).status, 0);
    const id = JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8")).artifacts.changes[0].id;
    assert.equal(runCli(["change", "archive", id, "--force"], dir).status, 0);

    const byArchive = archived(dir)[0];
    assert.match(byArchive.lane ?? "", /chore/, "change archive carries the lane");

    assert.equal(runCli(["index", "rebuild"], dir).status, 0);
    assert.deepEqual(archived(dir)[0], byArchive, "the rebuild derives the same entry");

    const report = runCli(["status", "--view", "report"], dir).stdout;
    assert.doesNotMatch(report, /- unknown: 1/);
    assert.match(report, /## Lanes[\s\S]*- (chore|product|runtime): 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
