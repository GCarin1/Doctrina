// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// SPEC SET SAYS WHICH THING TO CORRECT: THE INVOCATION OR THE SPEC.
//
// ADR 0018 gives `1` (GATE) to "fix the work, retry the same command" and
// `2` (USAGE) to "do not retry unchanged; correct the invocation". Every
// operation error of `spec set` answered 1 — including a value outside the
// header's domain, a malformed flag and a criterion that does not exist,
// which no edit to the spec will ever make succeed. An agent reading the
// code retried the same command; `show carteira-C99` already answered 2 for
// the same missing criterion.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-spec-set-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  assert.equal(runCli(["spec", "new", "carteira"], dir).status, 0);
  return dir;
}

const specPath = (dir) => path.join(dir, ".doctrina", "specs", "carteira", "spec.md");

test("an error in the invocation answers USAGE and leaves the spec untouched", () => {
  const dir = project();
  try {
    const before = readFileSync(specPath(dir), "utf8");
    for (const flags of [
      ["--status", "banana"],
      ["--implementation", "zzz"],
      ["--criterion", "99:verified"],
      ["--criterion", "1:banana"],
      ["--criterion", "9=verified"],
      ["--version", "banana"],
      ["--bump", "huge"],
    ]) {
      const r = runCli(["spec", "set", "carteira", ...flags], dir);
      assert.equal(r.status, 2, `${flags.join(" ")} — ${r.stderr}`);
      assert.match(r.stderr, /spec left untouched/);
    }
    assert.equal(readFileSync(specPath(dir), "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a spec that lacks what the operation needs answers GATE", () => {
  const dir = project();
  try {
    // Fixing the spec (restoring its Version header) makes the SAME command pass.
    const text = readFileSync(specPath(dir), "utf8");
    writeFileSync(specPath(dir), text.replace(/^\*\*Version:\*\*.*\r?\n/m, ""));
    const r = runCli(["spec", "set", "carteira", "--bump", "minor"], dir);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /no \*\*Version:\*\* header/);
    writeFileSync(specPath(dir), text);
    assert.equal(runCli(["spec", "set", "carteira", "--bump", "minor"], dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Both at once: the invocation must change regardless, so retrying it as is
// can never succeed — USAGE wins.
test("an invocation error next to a spec defect still answers USAGE", () => {
  const dir = project();
  try {
    const text = readFileSync(specPath(dir), "utf8");
    writeFileSync(specPath(dir), text.replace(/^\*\*Version:\*\*.*\r?\n/m, ""));
    const r = runCli(["spec", "set", "carteira", "--bump", "minor", "--status", "banana"], dir);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /2 operation errors/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
