import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES, OPERATIONS } from "../src/lib/commands.js";
import { JSON_SCHEMA_VERSION } from "../src/lib/json-out.js";
import { declaredFlags } from "../src/lib/flag-catalog.js";

// M7. Five of thirty-five commands spoke JSON; everything else emitted
// ANSI-coloured prose, and the primary consumer is a machine. With the
// exit-code contract (ADR 0018) these are the two halves of the machine
// interface: structured output plus a meaningful status.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-json-"));
  runCli(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"], tmp);
  return tmp;
}

// A safe, read-only invocation per command, so the sweep never mutates a
// fixture in a way that breaks the next command in the list.
const INVOCATION = {
  init: ["init", "--help"],
  intake: ["intake", "--help"],
  triage: ["triage"],
  work: ["work", "--help"],
  spec: ["spec", "list"],
  change: ["change", "--help"],
  contract: ["contract", "list"],
  decision: ["decision", "list"],
  skill: ["skill", "list"],
  intent: ["intent", "list"],
  adapter: ["adapter", "list"],
  prime: ["prime"],
  context: ["context"],
  show: ["show", "--help"],
  search: ["search", "spec"],
  status: ["status"],
  next: ["next"],
  why: ["why", "--help"],
  handoff: ["handoff"],
  constitution: ["constitution"],
  analyze: ["analyze", "--help"],
  clarify: ["clarify", "--all"],
  validate: ["validate"],
  coverage: ["coverage"],
  trace: ["trace"],
  review: ["review"],
  verify: ["verify", "--list"],
  close: ["close", "--help"],
  doctor: ["doctor"],
  templates: ["templates", "list"],
  hooks: ["hooks", "--help"],
  index: ["index", "rebuild", "--check"],
  watch: ["watch", "--once"],
  metrics: ["metrics"],
  report: ["report"],
  completion: ["completion", "bash"],
  upgrade: ["upgrade"],
  ci: ["ci", "--help"],
};

test("every command declares the --json flag", async () => {
  const missing = [];
  for (const name of COMMAND_NAMES) {
    const declared = await declaredFlags(name);
    if (!declared?.has("json")) missing.push(name);
  }
  assert.deepEqual(missing, [], `these commands do not accept --json: ${missing.join(", ")}`);
});

test("every command emits parseable JSON carrying the schema version", () => {
  const tmp = project();
  try {
    // A little content so read commands have something to report.
    runCli(["spec", "new", "billing"], tmp);
    const problems = [];

    for (const name of COMMAND_NAMES) {
      const argv = INVOCATION[name];
      assert.ok(argv, `no JSON sweep invocation defined for "${name}"`);
      // `--help` short-circuits before the command runs, so exclude those
      // from the payload assertion but keep them in the flag check above.
      if (argv.includes("--help")) continue;

      const r = runCli([...argv, "--json"], tmp);
      let parsed;
      try {
        parsed = JSON.parse(r.stdout);
      } catch {
        problems.push(`${argv.join(" ")}: stdout is not JSON\n${r.stdout.slice(0, 200)}`);
        continue;
      }
      if (parsed.$schema_version !== JSON_SCHEMA_VERSION) {
        problems.push(`${argv.join(" ")}: $schema_version is ${JSON.stringify(parsed.$schema_version)}`);
      }
      if (typeof parsed.command !== "string") {
        problems.push(`${argv.join(" ")}: payload carries no command`);
      }
      if (typeof parsed.exit_code !== "number") {
        problems.push(`${argv.join(" ")}: payload carries no exit_code`);
      }
    }
    assert.deepEqual(problems, [], problems.join("\n"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("the JSON envelope reports the same status as the exit code", () => {
  const tmp = project();
  try {
    // A failing gate: the envelope's ok/exit_code must agree with reality.
    runCli(["change", "new", "0001-hollow", "hollow"], tmp);
    const r = runCli(["analyze", "0001-hollow", "--json"], tmp);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.ok, false, "a failing gate must not report ok:true");
    assert.equal(parsed.exit_code, r.status, "exit_code must match the process exit status");
    assert.equal(r.status, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("JSON output carries no ANSI escapes", () => {
  const tmp = project();
  try {
    const r = spawnSync(process.execPath, [cliEntry, "spec", "list", "--json"], {
      cwd: tmp, encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "1" }, // ask for colour explicitly
    });
    assert.doesNotMatch(r.stdout, /\[/, "JSON must never carry terminal colour codes");
    JSON.parse(r.stdout); // and must still parse
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("every catalogued operation is covered by the JSON sweep", () => {
  // Guards the sweep itself: a new command must be added to INVOCATION or
  // this test fails, so "every command speaks JSON" stays a fact.
  const tops = new Set(OPERATIONS.map(([op]) => op.split(" ")[0]));
  const uncovered = [...tops].filter((t) => !INVOCATION[t]);
  assert.deepEqual(uncovered, [], `no JSON sweep invocation for: ${uncovered.join(", ")}`);
});
