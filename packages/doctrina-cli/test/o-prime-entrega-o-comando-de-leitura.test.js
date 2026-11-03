// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { forQuery } from "../src/commands/work.js";

// THE READ COMES AS A COMMAND TO COPY (change 0217).
//
// A field review: `prime` was taken as enough and `context` was skipped.
// `prime` ended on a generic "read deeper", and the work playbook printed
// `context <cap> --concat` with no `--for` — the one flag that cuts the
// pack to the task (change 0216). Both now hand over the exact command.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("prime names the read for the open change, and work's playbook carries --for", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-read-cmd-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    assert.equal(run(["spec", "new", "auth"]).status, 0);
    const work = run(["work", "expire the \"session\" token", "--capability", "auth"]);
    assert.equal(work.status, 0, work.stderr);
    assert.match(work.stdout, /doctrina context auth --for "expire the session token" --concat/);
    const id = /change (\d{4}-[a-z0-9-]+)/.exec(work.stdout)?.[1];
    assert.ok(id);
    assert.match(run(["prime"]).stdout, new RegExp(`Read for ${id}: doctrina context auth --for "expire the session token" --concat`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the --for argument is one quote-free line of at most 80 characters", () => {
  assert.equal(forQuery('add "SSO" `login`\n  now'), "add SSO login now");
  assert.ok(forQuery("word ".repeat(40)).length <= 80);
});
