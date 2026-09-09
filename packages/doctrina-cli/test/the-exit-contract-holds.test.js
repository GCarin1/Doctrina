import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0093 — o contrato de saída vale para todos.
//
// ADR 0018 declares five exit classes, and two of them say different things
// to whoever reads the code: `1` is GATE ("fix the work and retry"), `2` is
// USAGE ("correct the invocation"). Measured against a reference that does
// not exist, nine commands gave three different answers:
//
//   show, why, change check, spec set, decision accept, analyze  → 1
//   decision scope, context                                      → 0
//   coverage --only (fixed in change 0090)                       → 2
//
// Typing a name wrong asks nobody to fix the work. And a command that
// exits 0 over a reference it never found is the worst of the three: it
// approves — the same defect as change 0090's filter that matched nothing.
//
// The second deviation runs the other way. Of the CLI's listings, only
// `search` refused when it found nothing. The `insight` spec says of that
// family: a VIEW assembles what is there and never refuses. Finding nothing
// is the answer, not a failure.
//
// This test is the table itself, so a tenth command cannot quietly pick a
// fourth answer.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-exit-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

// USAGE, every one of them: the invocation named something that is not
// there, so the fix is the invocation.
const UNRESOLVED = [
  ["show", "naoexiste"],
  ["show", "carteira-R99"],
  ["show", "carteira-C99"],
  ["why", "naoexiste"],
  ["context", "naoexiste"],
  ["change", "check", "9999-nao-existe"],
  ["spec", "set", "naoexiste", "--implementation", "auto"],
  ["decision", "scope", "9999"],
  ["decision", "accept", "9999"],
  ["analyze", "9999-nao-existe"],
  ["coverage", "--only", "naoexiste"],
];

test("a reference that does not resolve costs the same class everywhere", () => {
  const dir = project();
  try {
    const classes = new Map();
    for (const args of UNRESOLVED) {
      const out = run(dir, args);
      classes.set(args.join(" "), out.status);
      assert.equal(out.status, 2,
        `${args.join(" ")} → ${out.status}\n${out.stderr || out.stdout}`);
    }
    assert.equal(new Set(classes.values()).size, 1,
      `three answers to one question: ${JSON.stringify([...classes])}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A VIEW assembles what is there. Nothing there is an answer, not a refusal.
const EMPTY_VIEWS = [
  ["search", "zzzznaoexistezzzz"],
  ["spec", "list"],
  ["decision", "list"],
  ["skill", "list"],
  ["contract", "list"],
  ["intent", "list"],
  ["templates", "list"],
];

test("a view with no result does not refuse", () => {
  const dir = project();
  try {
    for (const args of EMPTY_VIEWS) {
      const out = run(dir, args);
      assert.equal(out.status, 0,
        `${args.join(" ")} → ${out.status}\n${out.stderr || out.stdout}`);
    }
    const miss = run(dir, ["search", "zzzznaoexistezzzz"]);
    assert.match(miss.stdout, /no matches/, "it still says it found nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the classes that were already right did not move", () => {
  const dir = project();
  try {
    // 0 — the reference resolves and the command answers.
    assert.equal(run(dir, ["show", "carteira"]).status, 0);
    assert.equal(run(dir, ["why", "carteira"]).status, 0);
    assert.equal(run(dir, ["context", "carteira"]).status, 0);
    assert.equal(run(dir, ["search", "carteira"]).status, 0);

    // 0 — a capability an open change is staging, before any spec exists.
    // Refusing it would break the read an agent needs while writing the
    // spec that the change creates.
    assert.equal(run(dir, ["change", "new", "0001-nova", "nova capability"]).status, 0);
    mkdirSync(path.join(dir, ".doctrina", "changes", "0001-nova", "specs", "relatorio"), { recursive: true });
    writeFileSync(path.join(dir, ".doctrina", "changes", "0001-nova", "specs", "relatorio", "delta.md"),
      "# Spec Delta — capability: relatorio\n\n**Operation:** ADDED\n" +
      "**Target spec on apply:** `.doctrina/specs/relatorio/spec.md`\n");
    assert.equal(run(dir, ["context", "relatorio"]).status, 0,
      "a capability staged by an open change is in play");

    // 2 — a malformed invocation was already USAGE and stays there.
    assert.equal(run(dir, ["spec", "set", "carteira"]).status, 2,
      "no edit flags is still a usage error");
    assert.equal(run(dir, ["context", "--budget"]).status, 2);

    // 1 — a gate that measured real work and refused it stays GATE. The
    // scaffolded spec has criteria with no evidence, so --strict must fail
    // over the work, not over the invocation.
    assert.equal(run(dir, ["coverage", "--only", "carteira", "--strict"]).status, 1,
      "a real measurement that fails is still a gate failure");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
