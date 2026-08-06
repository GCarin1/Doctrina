import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { collectFindings } from "../src/commands/templates.js";

// C2: "a finding may only name a remedy that resolves it."
//
// A clean `doctrina init --agent claude` used to FAIL `templates check`,
// and both remedies the CLI offered were dead ends: `init --agent claude
// --force` regenerated the identical file, and `templates update --write`
// never touches adapters. Two commands named as fixes, neither connected
// to the finding by any code path.
//
// This suite seeds each finding and executes the remedy the CLI itself
// prints, asserting the finding is gone afterwards. A remedy that cannot
// clear its own finding fails here.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function initedProject(extraArgs = []) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-remedy-"));
  runCli(["init", "--non-interactive", "--project-name", "Acme",
    "--project-description", "x", ...extraArgs], tmp);
  return tmp;
}

// Seeded scenarios: each breaks the project in one way that produces at
// least one finding. The test does not hardcode the remedy — it reads it
// from the finding, which is the point.
const SCENARIOS = [
  {
    name: "a missing recommended AGENTS.md section",
    init: [],
    break(tmp) {
      const p = path.join(tmp, "AGENTS.md");
      writeFileSync(p, readFileSync(p, "utf8").replace(/^## Commands$/m, "## Renamed"));
    },
  },
  {
    name: "a stale doctrina:surface block",
    init: [],
    break(tmp) {
      const p = path.join(tmp, "AGENTS.md");
      writeFileSync(p, readFileSync(p, "utf8").replace("`doctrina prime (session start)`", "`doctrina gone`"));
    },
  },
  {
    name: "a missing doctrina:surface block",
    init: [],
    break(tmp) {
      const p = path.join(tmp, "AGENTS.md");
      writeFileSync(p, readFileSync(p, "utf8").replace(
        /<!--\s*doctrina:surface:begin[\s\S]*?doctrina:surface:end\s*-->/, ""));
    },
  },
  {
    name: "an adapter that lost its AGENTS.md pointer",
    init: ["--agent", "claude"],
    break(tmp) {
      writeFileSync(path.join(tmp, "CLAUDE.md"), "# CLAUDE.md\n\nProject notes only.\n");
    },
  },
  {
    name: "a missing product.md section",
    init: [],
    break(tmp) {
      const p = path.join(tmp, ".doctrina", "product.md");
      writeFileSync(p, readFileSync(p, "utf8").replace(/^## Vision$/m, "## Renamed"));
    },
  },
];

for (const scenario of SCENARIOS) {
  test(`remedy resolves its finding: ${scenario.name}`, () => {
    const tmp = initedProject(scenario.init);
    try {
      assert.equal(collectFindings(tmp).findings.length, 0,
        "the fixture must start clean, or the test proves nothing");

      scenario.break(tmp);
      const before = collectFindings(tmp).findings;
      assert.ok(before.length > 0, "the scenario must actually produce a finding");

      // Run whatever the CLI told the user to run — verbatim.
      const remedies = [...new Set(before.map((f) => f.remedy).filter(Boolean))];
      assert.ok(remedies.length > 0,
        `no finding named a remedy:\n${before.map((f) => f.message).join("\n")}`);
      for (const remedy of remedies) {
        const argv = remedy.split(/\s+/).slice(1); // drop the leading "doctrina"
        const r = runCli(argv, tmp);
        assert.notEqual(r.status, 2, `remedy "${remedy}" is not a valid invocation:\n${r.stderr}`);
      }

      const after = collectFindings(tmp).findings;
      assert.equal(after.length, 0,
        `remedies [${remedies.join(", ")}] did not clear the findings:\n` +
        after.map((f) => `  - ${f.message}  (fix: ${f.remedy})`).join("\n"));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
}

test("every templates finding names a remedy or says repair is manual", () => {
  // The contract: `remedy` is either an executable command or explicitly
  // null. A finding with a vague prose hint and no command is the failure
  // mode this replaces.
  const tmp = initedProject();
  try {
    writeFileSync(path.join(tmp, "AGENTS.md"), "# broken\n");
    for (const f of collectFindings(tmp).findings) {
      assert.ok(typeof f.message === "string" && f.message.length > 0, "a finding needs a message");
      assert.ok(f.remedy === null || /^doctrina\s+\S+/.test(f.remedy),
        `remedy must be a doctrina command or null, got: ${JSON.stringify(f.remedy)}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a fresh init passes templates check for every adapter", () => {
  // The C2 headline: a clean install failed its own gate. Cover every
  // adapter, not just the one that happened to be reported.
  const adapters = ["claude", "cursor", "gemini", "copilot", "aider", "windsurf",
    "continue", "codex", "amp", "devin", "factory", "jules"];
  for (const agent of adapters) {
    const tmp = initedProject(["--agent", agent]);
    try {
      const { findings } = collectFindings(tmp);
      assert.equal(findings.length, 0,
        `init --agent ${agent} does not pass templates check:\n` +
        findings.map((f) => `  - ${f.message}`).join("\n"));
      assert.equal(runCli(["templates", "check"], tmp).status, 0, `templates check exits non-zero for ${agent}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
});

test("doctor's templates row names the finding's own remedy, not a generic one", () => {
  const tmp = initedProject(["--agent", "claude"]);
  try {
    writeFileSync(path.join(tmp, "CLAUDE.md"), "# CLAUDE.md\n\nProject notes only.\n");
    const r = runCli(["doctor"], tmp);
    const line = r.stdout.split(/\r?\n/).find((l) => l.includes("templates"));
    assert.ok(line, `doctor printed no templates row:\n${r.stdout}`);
    // The old row said "recommended sections/fields are missing" and sent
    // the user to `templates update`, which cannot fix an adapter pointer.
    assert.ok(!/recommended sections\/fields are missing/.test(r.stdout),
      "doctor must not mislabel an adapter finding as a missing section");
    assert.match(r.stdout, /adapter add claude --force/,
      "doctor must name the remedy that actually resolves the finding");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
