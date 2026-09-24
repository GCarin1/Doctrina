// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { nextStepAfterInit } from "../src/lib/intake-model.js";

// THE FIRST RUN GIVES ONE INSTRUCTION, AND IT IS THE ONE `next` GIVES.
//
// A person who ran `doctrina init` was told three different things: `init`
// said "edit AGENTS.md and .doctrina/product.md for your project", `next`
// asked for the description again as an intake, and AGENTS.md said the
// agent runs the commands while the human stays passive. And the
// description typed at init's prompt went into product.md only, so the
// intake `next` then asked for was the same answer, asked twice.
//
// At a terminal the one question's answer is now the intake, and the closing
// line tells the person to hand over to their agent. The terminal path is
// exercised through `nextStepAfterInit`, since a pseudo-terminal is not
// portable to every CI runner; the scripted path runs end to end.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("after a description typed at the terminal, the person is sent to their agent", () => {
  const lines = nextStepAfterInit("tty").join("\n");
  assert.match(lines, /open your AI agent/);
  assert.match(lines, /read AGENTS\.md and run doctrina next/);
  assert.doesNotMatch(lines, /edit/i, "the human is not asked to hand-author anything");
});

test("without an intake, init and next point at the same command", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-first-run-"));
  try {
    const init = runCli(["init", "--non-interactive", "--project-name", "Acme",
      "--project-description", "A portfolio tracker"], dir);
    assert.equal(init.status, 0, init.stderr);
    assert.ok(!existsSync(path.join(dir, ".doctrina", "intake.md")));
    assert.doesNotMatch(init.stdout, /Next: edit/);
    assert.match(init.stdout, /doctrina intake --text/);
    assert.match(init.stdout, /doctrina work --from-diff/);
    const next = runCli(["next"], dir);
    assert.match(next.stdout, /doctrina intake --text/, "the same door, in both places");
    assert.match(next.stdout, /doctrina work --from-diff/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("with an intake given as a flag, the agent's playbook is still printed", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-first-run-"));
  try {
    const r = runCli(["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", "A portfolio tracker for individual investors that sums positions and computes returns."], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /execute the bootstrap playbook below/);
    assert.match(runCli(["next"], dir).stdout, /pending intake/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
