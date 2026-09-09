import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Changes 0100 and 0101 — two retrieval-path stragglers.
//
// `search` matched raw substrings, so an accent decided the answer:
// `search patrimonio` found nothing in a spec that says "patrimônio". The
// shared lexicon (ADR 0040) has folded for `work` and `context --for` since
// it existed; `search` was the one retrieval surface still deciding on its
// own. Note the direction — the field report had it backwards. Typing
// WITHOUT the accent is the common case, and that was the one that failed.
//
// `clarify <missing-file>` exited 1, the gate class, for what is a wrong
// invocation: retrying it unchanged never succeeds, and an agent branching
// on the code reads 1 as "the work is not ready" and iterates forever
// (ADR 0018). Every sibling that takes a path already exited 2.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-retrieval-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  mkdirSync(path.join(dir, ".doctrina", "specs", "carteira"), { recursive: true });
  writeFileSync(path.join(dir, ".doctrina", "specs", "carteira", "spec.md"), [
    "# Spec — carteira", "",
    "**Capability:** carteira",
    "**Status:** draft",
    "**Implementation:** planned",
    "**Realizes:** n/a — fixture",
    "**Last updated:** 2026-09-09",
    "**Version:** 0.1.0", "",
    "## Purpose", "",
    "Gerir o património e a informação do cliente.", "",
    "## Acceptance criteria", "",
    "1. [unverified] x — verified by `a/b.md`.", "",
  ].join("\n"));
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

test("search finds accented text from an unaccented query, and the reverse", () => {
  const dir = project();
  try {
    for (const term of ["patrimonio", "património", "informacao", "informação"]) {
      const r = run(dir, ["search", term]);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /1 match in 1 file/,
        `\`search ${term}\` found nothing in a spec that contains it`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("folding does not make search match everything", () => {
  // The fold must widen what matches, not erase the distinction.
  const dir = project();
  try {
    const r = run(dir, ["search", "cavalo"]);
    assert.match(r.stdout + r.stderr, /no matches/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("clarify refuses a path that does not exist with the usage class", () => {
  const dir = project();
  try {
    const missing = run(dir, ["clarify", "nao-existe.md"]);
    assert.equal(missing.status, 2,
      "a path that does not exist is a wrong invocation, not a failed gate");
    assert.match(missing.stderr, /file not found/);

    // And the real thing still works, and still gates.
    assert.equal(run(dir, ["clarify", "AGENTS.md"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every command that takes a path answers the same way", () => {
  // The finding was inconsistency, so this is the assertion that matters.
  const dir = project();
  try {
    for (const argv of [["clarify", "nope.md"], ["intake", "--file", "nope.md"],
                        ["templates", "check", "--path", "nope.md"]]) {
      const r = run(dir, argv);
      assert.equal(r.status, 2,
        `\`${argv.join(" ")}\` exited ${r.status} for a missing path`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
