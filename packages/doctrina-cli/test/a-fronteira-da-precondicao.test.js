// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { EXIT } from "../src/lib/exit-codes.js";
import { COMMAND_NAMES } from "../src/lib/commands.js";

// THE PRECONDITION BOUNDARY, WALKED RATHER THAN ASSUMED.
//
// The classes are a contract for machines: 1 says "fix your work and retry
// the same command", 3 says "run the setup command named in the error, then
// retry". They are not interchangeable — an agent that reads 1 where 3 was
// meant retries an invocation that can never clear.
//
// Two exits sat outside the contract, and both were invisible because the
// suite asked about commands one at a time. `hooks install` outside a git
// repository answered 1, with no `hint:` naming the setup. And the `cli`
// spec's rule — outside a project, every command but `init`, `--help` and
// `--version` errors — had a fourth, undeclared exception: `next` answers
// with the init action and exits 0, on purpose, because "what do I do now"
// has a real answer here.
//
// So the boundary is walked in full: every command, outside a project.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// The commands that legitimately have something to say with no project
// around them. `init` creates one. The rest answer from the CLI itself, not
// from a tree: `next` names the door, `completion` emits a shell script,
// `ci --emit` renders the gate sequence from its declaration, and
// `templates list` shows what would be resolved. The spec used to name
// three exceptions when there were seven.
const EXEMPT = new Set(["init", "next", "completion", "ci", "templates"]);

// A subcommand each hub accepts, so the walk reaches the command's own body
// instead of stopping at its usage error.
const SUBCOMMAND = {
  spec: ["list"], change: ["check", "0001-x"], decision: ["list"], contract: ["list"],
  skill: ["list"], adapter: ["list"], templates: ["list"], intent: ["list"],
  index: ["rebuild", "--check"], hooks: ["install"], work: ["uma coisa"],
  show: ["cap"], why: ["cap"], search: ["termo"], close: ["0001-x"], triage: ["x"],
  ci: ["--emit", "github"], completion: ["bash"],
  analyze: ["0001-x"], clarify: ["--all"], coverage: [], trace: [],
};

test("outside a project, every command answers the precondition class", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-precond-"));
  try {
    const wrong = [];
    for (const name of COMMAND_NAMES) {
      if (EXEMPT.has(name)) continue;
      const r = runCli([name, ...(SUBCOMMAND[name] ?? [])], dir);
      if (r.status !== EXIT.PRECONDITION) wrong.push(`${name} -> ${r.status}`);
    }
    assert.deepEqual(wrong, [],
      "a command that cannot run because the project is not set up owes the "
      + "precondition class — 1 tells an agent to retry something that never clears");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the spec declares the exemptions the CLI actually has", () => {
  const spec = readFileSync(path.join(repoRoot, ".doctrina", "specs", "cli", "spec.md"), "utf8")
    .replace(/\s+/g, " ");
  const rule = /While the current working directory does not contain `\.doctrina\/`[^.]*\./.exec(spec)?.[0] ?? "";
  assert.ok(rule, "precondition: the spec states the rule");
  for (const name of EXEMPT) {
    // The rule names some exceptions by the invocation that is exempt
    // (`ci --emit`, `templates list`), so match the opening backtick + name.
    assert.ok(rule.includes(`\`${name}`),
      `the rule must name \`${name}\` among its exceptions; an undeclared one is `
      + `a sentence the CLI stopped honouring. Rule reads: ${rule}`);
  }
});

test("an exempt command answers instead of refusing", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-exempt-"));
  try {
    const next = runCli(["next"], dir);
    assert.equal(next.status, EXIT.OK);
    assert.match(next.stdout, /doctrina init/,
      "the one command whose whole job is `what now` must answer it here");

    // Exempt means it produces its output, not that it exits 0 in silence.
    assert.match(runCli(["completion", "bash"], dir).stdout, /_doctrina/);
    assert.match(runCli(["ci", "--emit", "github"], dir).stdout, /doctrina validate/);
    assert.match(runCli(["templates", "list"], dir).stdout, /proposal\.md\.template/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// One condition, one sentence, one class. `change apply|archive|check` went
// through a helper whose catch-all flattened every thrown error to 1, so the
// same refusal `change new` reported as a precondition came back as a failed
// gate one switch arm away.
test("every not-a-project refusal is the same sentence and the same class", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-same-"));
  try {
    for (const args of [["change", "check", "0001-x"], ["change", "apply", "0001-x"],
      ["change", "archive", "0001-x"], ["change", "new", "0001-x", "t"],
      ["templates", "check"], ["templates", "update"], ["analyze", "0001-x"],
      ["validate"], ["close", "0001-x"]]) {
      const r = runCli(args, dir);
      assert.equal(r.status, EXIT.PRECONDITION, `${args.join(" ")} -> ${r.status}`);
      assert.match(r.stderr, /not a Doctrina project/, args.join(" "));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// And a real per-id failure must still read as one: the fix lets TYPED
// errors through, it does not stop reporting the untyped ones.
test("a per-id failure is still reported per id", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-perid-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const r = runCli(["change", "check", "9999-nao-existe"], dir);
    assert.notEqual(r.status, 0, "a change that does not exist is not a pass");
    assert.match(r.stdout + r.stderr, /9999-nao-existe/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A precondition is only actionable if it names the way out.
test("a precondition error names the command that clears it", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-hint-"));
  try {
    const outside = runCli(["validate"], dir);
    assert.equal(outside.status, EXIT.PRECONDITION);
    assert.match(outside.stderr, /hint:.*doctrina init/);

    // Inside a project, but with no git repository for the hook to live in.
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const hooks = runCli(["hooks", "install"], dir);
    assert.equal(hooks.status, EXIT.PRECONDITION,
      "the place to put the hook does not exist yet; nothing was measured");
    assert.match(hooks.stderr, /hint:.*git init/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
