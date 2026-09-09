import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES } from "../src/lib/commands.js";
import { declaredFlags } from "../src/lib/flag-catalog.js";

// Change 0082 — an unknown flag is refused, never ignored.
//
// Declaring the flags (C3) stopped the parser swallowing a positional; it did
// not make anything CHECK the declaration, so an unrecognised flag was simply
// dropped. On one tree with a pending criterion:
//
//     doctrina coverage --strict    -> exit 1   (the gate fails, correctly)
//     doctrina coverage --stricts   -> exit 0   (the gate never ran)
//
// That is the most expensive failure a gate can have: it is indistinguishable
// from success. A CI job with a typo in `--strict` stays green forever over a
// tree the gate would reject.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// A project whose coverage gate genuinely fails under --strict, so the two
// exit codes are actually different and the defect is observable.
function projectWithFailingGate() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-flag-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  return dir;
}

test("the gate that was asked for is the gate that runs", () => {
  const dir = projectWithFailingGate();
  try {
    assert.equal(run(dir, ["coverage", "--strict"]).status, 1,
      "the fixture must actually fail under --strict, or this proves nothing");

    const typo = run(dir, ["coverage", "--stricts"]);
    assert.equal(typo.status, 2, "a usage error, not a passing gate");
    assert.match(typo.stderr, /unknown flag "--stricts"/);
    assert.match(typo.stderr, /did you mean `--strict`\?/);
    // The gate must NOT have reported a verdict it was not asked for.
    assert.equal(typo.stdout, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every flag every command declares is still accepted", async () => {
  // The regression that would matter most: refusing something that worked.
  // Asserted against the declaration itself, so a flag added later is
  // covered without editing this test.
  const dir = projectWithFailingGate();
  try {
    for (const name of COMMAND_NAMES) {
      const declared = await declaredFlags(name);
      assert.ok(declared, `${name} declares no flags`);
      for (const flag of declared) {
        if (flag === "help" || flag === "h" || flag === "v") continue;
        const out = run(dir, [name, `--${flag}`, "--help"]);
        assert.doesNotMatch(out.stderr, /unknown flag/,
          `\`doctrina ${name} --${flag}\` was refused, and it is declared`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown flag is refused on every command, with its name", () => {
  const dir = projectWithFailingGate();
  try {
    for (const name of COMMAND_NAMES) {
      const out = run(dir, [name, "--definitely-not-a-flag"]);
      assert.equal(out.status, 2, `${name} did not refuse an unknown flag`);
      assert.match(out.stderr, /unknown flag "--definitely-not-a-flag"/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--help still explains the command, even alongside a typo", () => {
  const dir = projectWithFailingGate();
  try {
    const out = run(dir, ["coverage", "--stricts", "--help"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /coverage/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a flag value is never mistaken for an unknown flag", () => {
  const dir = projectWithFailingGate();
  try {
    // `--budget 30000`: the value must not be read as a flag, and the
    // command must actually honour it.
    const out = run(dir, ["context", "--budget", "30000"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.doesNotMatch(out.stderr, /unknown flag/);
    assert.match(out.stdout + out.stderr, /30000 tokens/);

    // And everything after `--` stays positional.
    const dashed = run(dir, ["search", "--", "--not-a-flag"]);
    assert.doesNotMatch(dashed.stderr, /unknown flag/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
