// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// WHAT AN ADAPTER INSTALLS TEACHES THE SAME CLOSE THE PLAYBOOK DOES.
//
// The `/doctrina-work` commands the Claude Code and Cursor adapters install
// told the agent to run `doctrina analyze <id>` → `doctrina change apply <id>`
// and THEN `doctrina close <id>` — two steps the close runs itself, taught
// as manual prerequisites, in the one file an agent reads when a person
// types the slash command. Every installed file now leaves the lifecycle to
// the close, and previews it with `change check`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (name === ".doctrina" || name === ".git") return [];
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test("no installed adapter file hands the agent a manual analyze or apply", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-adapters-"));
  try {
    const r = spawnSync(process.execPath, [cliEntry, "init", "--non-interactive", "--project-name", "Acme", "--agent", "all"],
      { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    assert.equal(r.status, 0, r.stderr);
    const installed = files(dir).filter((f) => path.basename(f) !== "AGENTS.md");
    assert.ok(installed.length > 0);
    for (const f of installed) {
      const text = readFileSync(f, "utf8");
      assert.doesNotMatch(text, /doctrina (analyze|change apply|change archive)\b/, path.relative(dir, f));
    }
    const work = installed.filter((f) => path.basename(f).startsWith("doctrina-work"));
    assert.ok(work.length >= 2, "the Claude Code and Cursor work commands");
    for (const f of work) {
      const text = readFileSync(f, "utf8");
      assert.match(text, /doctrina close <id>/, path.relative(dir, f));
      assert.match(text, /doctrina change check <id>/, path.relative(dir, f));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
