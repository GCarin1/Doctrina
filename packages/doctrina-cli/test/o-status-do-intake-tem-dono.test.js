// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { INTAKE_STATUSES, intakeStatus, intakeStatusError } from "../src/lib/intake-model.js";
import { EXIT } from "../src/lib/exit-codes.js";

// A CONTROL VALUE GETS AN OWNER AND A GATE.
//
// `next` branches on the intake's Status to decide whether the bootstrap is
// finished. Every other status in this tree is written by a command and
// checked against an enum — `spec set` refuses "Status: nonsense" and
// `validate` calls it an error. The intake was the one header the playbook
// told an agent to edit BY HAND, and the one nothing read back.
//
// So every token that was not exactly "converted" meant pending, silently:
// "convertido" typed in a Portuguese project, "done", or an empty value left
// by a botched edit. `validate` exited 0 on all three and `next` went on
// asking for a bootstrap that had already happened.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-intake-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Carteira"], dir).status, 0);
  assert.equal(runCli(["intake", "--text",
    "Uma carteira que importa notas e calcula o preco medio de cada ativo."], dir).status, 0);
  return dir;
}

const intakeOf = (dir) => path.join(dir, ".doctrina", "intake.md");
const setStatus = (dir, value) => {
  const p = intakeOf(dir);
  writeFileSync(p, readFileSync(p, "utf8").replace(/- \*\*Status:\*\*.*/, `- **Status:** ${value}`));
};

test("the two declared words are the only ones that pass", () => {
  const dir = project();
  try {
    for (const good of INTAKE_STATUSES) {
      setStatus(dir, good);
      assert.equal(runCli(["validate"], dir).status, EXIT.OK, good);
    }
    for (const bad of ["convertido", "done", "", "Convertida"]) {
      setStatus(dir, bad);
      const r = runCli(["validate"], dir);
      assert.equal(r.status, EXIT.GATE, `"${bad}" must be refused, not read as pending`);
      assert.match(r.stdout + r.stderr, /intake\.md: Status must be one of pending\|converted/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A note after the value is allowed everywhere else in the tree; case is not
// a difference anywhere else either.
test("the value is read the way every other status is read", () => {
  const mk = (v) => `# Intake — X\n\n- **Status:** ${v}\n- **Date:** 2026-09-23\n`;
  assert.equal(intakeStatus(mk("Converted")), "converted", "case is not a difference");
  assert.equal(intakeStatusError(mk("converted — on 2026-09-23")), null, "a note may follow the value");
  assert.equal(intakeStatus(mk("")), "", "an empty value is not silently pending");
  assert.ok(intakeStatusError(mk("")), "and it is reported");
});

test("the CLI closes the bootstrap, so the playbook need not hand-author a header", () => {
  const dir = project();
  try {
    assert.match(readFileSync(intakeOf(dir), "utf8"), /- \*\*Status:\*\* pending/);
    assert.match(runCli(["next"], dir).stdout, /pending intake awaits conversion/);

    const r = runCli(["intake", "--converted"], dir);
    assert.equal(r.status, EXIT.OK, r.stderr || r.stdout);
    assert.match(readFileSync(intakeOf(dir), "utf8"), /- \*\*Status:\*\* converted/);
    assert.equal(runCli(["validate"], dir).status, EXIT.OK);
    assert.doesNotMatch(runCli(["next"], dir).stdout, /pending intake awaits conversion/,
      "the recommendation must move on once the bootstrap is closed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("marking a bootstrap that never started is a precondition, not a gate", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-sem-intake-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "X"], dir).status, 0);
    const r = runCli(["intake", "--converted"], dir);
    assert.equal(r.status, EXIT.PRECONDITION);
    assert.match(r.stderr, /hint:.*doctrina intake --text/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The playbook is what an agent executes; it must name the command.
test("the bootstrap playbook points at the command, not at the file", () => {
  const tpl = readFileSync(path.resolve(here, "..", "..", "..",
    ".doctrina", "templates", "playbooks", "bootstrap.md.template"), "utf8");
  assert.match(tpl, /doctrina intake --converted/,
    "step 7 must name the command that writes the header");
  assert.doesNotMatch(tpl, /flip\s+"?- \*\*Status:\*\*/,
    "and must not tell the agent to edit the header by hand");
});
