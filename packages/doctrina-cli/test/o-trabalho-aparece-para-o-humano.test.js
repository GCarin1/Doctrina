// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE WORK IS VISIBLE TO THE PERSON WHO ASKED FOR IT (change 0214).
//
// A field review: `work` ran in the terminal, the open folder lived for
// minutes, and `close` moved everything to `changes/archive/`, out of every
// default read — so the next request was to "create the doctrina work" for
// two changes already archived. The CLI now writes the sentence for the
// human at both ends, and `prime` and the pulse name what was just closed.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("work and prime tell the human what opened and what closed, and where", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-visible-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    const out = run(["work", "--chore", "tidy the CI matrix", "--id", "0001-tidy"]);
    assert.match(out.stdout, /\nTell the human: opened change 0001-tidy — "tidy the CI matrix" \(\.doctrina\/changes\/0001-tidy\/\)\n?$/);

    // A change archived today, as the close leaves it.
    const today = new Date().toISOString().slice(0, 10);
    const archived = path.join(dir, ".doctrina", "changes", "archive", `${today}-0000-payments`);
    mkdirSync(archived, { recursive: true });
    writeFileSync(path.join(archived, "proposal.md"), "# Change 0000-payments — Payment scenarios\n\n- **Status:** applied\n");
    const prime = run(["prime"]).stdout;
    assert.match(prime, /Recently closed \(last 7 days\)\n {2}0000-payments {2}Payment scenarios \(\d{4}-\d\d-\d\d → \.doctrina\/changes\/archive\/\d{4}-\d\d-\d\d-0000-payments\/\)/);

    run(["change", "abandon", "0001-tidy", "--force"]);
    assert.match(run(["prime", "--pulse"]).stdout, /Last closed: 0000-payments \(\d{4}-\d\d-\d\d, \.doctrina\/changes\/archive\/.*0000-payments\/\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("close ends with the archive path, for the human", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-visible-close-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    assert.equal(run(["change", "new", "0001-tidy", "Tidy", "--chore"]).status, 0);
    const changeDir = path.join(dir, ".doctrina", "changes", "0001-tidy");
    writeFileSync(path.join(changeDir, "tasks.md"), "# Tasks\n\n- [x] Did it\n");
    const proposal = path.join(changeDir, "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8")
      .replace(/## Why\r?\n\r?\n[^\r\n]*\r?\n/, "## Why\n\nThe matrix ran twice.\n")
      .replace(/## What\r?\n\r?\n<!--[^]*?-->/, "## What\n\nOne matrix."));
    assert.equal(run(["change", "tick", "0001-tidy", "--all"]).status, 0);
    const out = run(["close", "0001-tidy"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /Tell the human: change 0001-tidy is closed — archived at \.doctrina\/changes\/archive\/\d{4}-\d\d-\d\d-0001-tidy\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
