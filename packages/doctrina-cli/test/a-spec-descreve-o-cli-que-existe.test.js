// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// TWO SPECS, ONE COMMAND.
//
// The `insight` spec was split out of `gates`, requirement text and all, and
// two of the carried-over sentences described a CLI that had already changed
// underneath them: `search` "shall exit 0 when matches exist and 1 otherwise",
// and `show` "exiting 1 for an unresolvable reference". The CLI exits 0 and 2.
// The `cli` spec says so in its own words — "shall not refuse a view that found
// nothing", and an unresolvable reference costs the usage class — so the tree
// held two specs contradicting each other about the same command, and every
// deterministic gate stayed green: coverage asks whether a criterion cites
// evidence, never whether a requirement is true (ADR 0005).
//
// Nothing catches a false sentence in general. What can be caught is this
// one: the classes these two commands actually return.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-spec-truth-"));
  const r = runCli(["init", "--non-interactive", "--project-name", "Acme"], dir);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return dir;
}

const OK = 0;
const USAGE = 2;

test("a search that finds nothing says so and succeeds", () => {
  const dir = project();
  try {
    const miss = runCli(["search", "zzz-no-such-term-zzz"], dir);
    assert.equal(miss.status, OK, "a view that found nothing has not failed");
    assert.match(miss.stdout, /no matches/);
    assert.equal(runCli(["search", "AGENTS"], dir).status, OK,
      "and a search that finds something is not a different class");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a reference show cannot resolve costs the usage class", () => {
  const dir = project();
  try {
    for (const ref of ["nosuchcap", "nosuchcap-R1", "9999"]) {
      assert.equal(runCli(["show", ref], dir).status, USAGE,
        `\`show ${ref}\` must answer the class a consumer branches on`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The behaviour above is the contract; these read the spec back, so the
// sentences cannot drift away from it again in silence.
test("the insight spec does not describe the classes the CLI dropped", () => {
  // Requirement bullets are line-wrapped, so the sentence to look for is
  // broken across lines in the file. Flatten first — an earlier draft of this
  // test matched the raw text, found nothing, and passed against the very
  // sentence it was written to catch.
  const spec = readFileSync(path.join(repoRoot, ".doctrina", "specs", "insight", "spec.md"), "utf8")
    .replace(/\s+/g, " ");
  const bullet = (command) =>
    new RegExp(`- When \`doctrina ${command}[\\s\\S]*?(?=- When |### )`).exec(spec)?.[0] ?? "";

  const search = bullet("search");
  assert.ok(search, "precondition: the spec states what `search` does");
  assert.doesNotMatch(search, /exit 0 when matches exist and 1 otherwise/,
    "the sentence the CLI stopped honouring");

  const show = bullet("show");
  assert.ok(show, "precondition: the spec states what `show` does");
  assert.doesNotMatch(show, /exiting 1 for an unresolvable reference/,
    "the sentence the CLI stopped honouring");
});
