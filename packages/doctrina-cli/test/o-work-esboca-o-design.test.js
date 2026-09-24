// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// `work` IS THE DOOR; IT OPENS EVERY ROOM `change new` OPENS.
//
// `work` opens its change through `change new`, but refused `--design`
// as an undeclared flag: a change that needed a design doc had to leave the
// recommended door for the manual one. Now `work --design` writes the same
// design.md `change new --design` writes, and without the flag neither
// scaffolds one (design.md stays opt-in).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("work --design scaffolds the design.md change new --design scaffolds", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-work-design-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const changes = path.join(dir, ".doctrina", "changes");

    const byWork = runCli(["work", "Add the cache", "--id", "0001-cache", "--design", "--quiet", "--chore"], dir);
    assert.equal(byWork.status, 0, byWork.stderr);
    const byNew = runCli(["change", "new", "0002-cache", "Add the cache", "--design", "--chore", "--force"], dir);
    assert.equal(byNew.status, 0, byNew.stderr);
    const design = (id) => readFileSync(path.join(changes, id, "design.md"), "utf8").replace(new RegExp(id, "g"), "<id>");
    assert.equal(design("0001-cache"), design("0002-cache"));

    const plain = runCli(["work", "Add the queue", "--id", "0003-queue", "--quiet", "--chore", "--force"], dir);
    assert.equal(plain.status, 0, plain.stderr);
    assert.ok(!existsSync(path.join(changes, "0003-queue", "design.md")), "design.md stays opt-in");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
