import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { hasDetectableTrigger } from "../src/lib/validation-model.js";

// Change 0111 — um scaffold não é um artefato.
//
// Tasks and specs had a placeholder check; contracts and skills had none.
// A freshly scaffolded contract (`<NAME>` rows, `specs/<capability>`)
// passed validate; a freshly scaffolded skill was "up to date" to `skill
// sync` and its `<one-sentence summary ...>` was served into every context
// pack, while its `<one-sentence trigger ...>` passed for a detectable
// trigger because it had enough words.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-scaffold-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  return dir;
}

test("a trigger still in the scaffold's <...> form is not detectable", () => {
  assert.equal(hasDetectableTrigger("<one-sentence trigger — when the agent should load this skill>"), false);
  assert.equal(hasDetectableTrigger("when a `.doctrina/` file is CRLF and a patch script no-ops"), true);
});

test("a scaffolded contract and a scaffolded skill each draw a validate warning, until written", () => {
  const dir = project();
  assert.equal(run(dir, ["contract", "new", "api"]).status, 0);
  assert.equal(run(dir, ["skill", "new", "crlf-trap"]).status, 0);
  let res = run(dir, ["validate"]);
  assert.match(res.stdout, /warn: .*contracts\/api\.md still carries the scaffold's placeholder rows/);
  assert.match(res.stdout, /warn: .*skills\/crlf-trap\.md .*description.* still the scaffold's placeholder/);

  const sync = run(dir, ["skill", "sync"]);
  assert.match(sync.stdout, /crlf-trap .*still the scaffold/);

  // Write them, and the warnings go quiet.
  const contractPath = path.join(dir, ".doctrina", "contracts", "api.md");
  let text = readFileSync(contractPath, "utf8");
  const written = text
    .replace(/\| <NAME>\s+\| vars\s+\| <path>\s+\| <job>\s+\| <file>\s+\|/, "| DATABASE_URL | vars | .github/workflows/ci.yml | test | app.py |")
    .replace(/\| <NAME>\s+\| <glob>\s+\| <regex>\s+\| <tag>\s+\|/, "| smoke | features/**/*.feature | @([a-z0-9_-]+) | smoke |")
    .replace(/\| <NAME>\s+\| input\/output\s+\| <count>\s+\|/, "| tokens | output | 15000 |")
    .replace("- `specs/<capability>`", "- `specs/carteira`");
  assert.notEqual(written, text, "the contract was written");
  writeFileSync(contractPath, written);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);

  const skillPath = path.join(dir, ".doctrina", "skills", "crlf-trap.md");
  text = readFileSync(skillPath, "utf8");
  const skill = text
    .replace(/^description: .*$/m, "description: Patch a CRLF file without a silent no-op")
    .replace(/^when: .*$/m, "when: editing a `.doctrina/` file with a script whose pattern is anchored on `\\n`");
  assert.notEqual(skill, text, "the skill was written");
  writeFileSync(skillPath, skill);
  assert.equal(run(dir, ["skill", "sync"]).status, 0);

  res = run(dir, ["validate"]);
  assert.doesNotMatch(res.stdout, /contracts\/api\.md still carries/);
  assert.doesNotMatch(res.stdout, /skills\/crlf-trap\.md/);
});
