import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0086 — the JSON envelope tells the truth about the verdict.
//
// `emitJson` defaulted to `ok = true, exitCode = 0`, and nine of its ten call
// sites passed neither: a command that builds its own payload emits BEFORE it
// returns, so the call site cannot know the code. Measured:
//
//     doctrina coverage --strict          -> process exits 1
//     doctrina coverage --strict --json   -> process exits 1
//                                            payload: ok true, exit_code 0
//
// `exit_code` was 0 in every native payload the CLI had ever emitted, and
// `ok` was right only in `validate` — by accident, because it passed `ok`
// inside `data` and the spread overwrote the envelope's field. The docs say
// "Branch on those", and the whole point of --json is a consumer that never
// reads the English.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// Run the same invocation twice — with and without --json — and return the
// process code alongside what the payload claims.
function verdict(cwd, args) {
  const plain = run(cwd, args);
  const json = run(cwd, [...args, "--json"]);
  let payload = null;
  try {
    payload = JSON.parse(json.stdout);
  } catch {
    assert.fail(`--json did not emit parseable JSON for \`${args.join(" ")}\`:\n${json.stdout}`);
  }
  return { code: plain.status, jsonCode: json.status, payload };
}

// A tree where coverage, trace and validate all have something to fail on.
function brokenProject() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-envelope-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  const spec = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
  writeFileSync(spec, readFileSync(spec, "utf8")
    .replace(/\*\*Realizes:\*\*.*/, "**Realizes:** SC9"));
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

test("a failing gate reports the failure in its payload too", () => {
  const dir = brokenProject();
  try {
    for (const args of [["coverage", "--strict"], ["trace", "--strict"]]) {
      const v = verdict(dir, args);
      assert.equal(v.code, 1, `\`${args.join(" ")}\` must fail for this to prove anything`);
      assert.equal(v.jsonCode, 1, "--json must not change the process code");
      assert.equal(v.payload.exit_code, v.code,
        `payload.exit_code disagrees with the process for \`${args.join(" ")}\``);
      assert.equal(v.payload.ok, false,
        `payload.ok claims success for a gate that failed: \`${args.join(" ")}\``);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a passing gate still reports success", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-envelope-"));
  try {
    assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", "uma carteira"]).status, 0);
    for (const args of [["validate"], ["trace"], ["status"], ["next"]]) {
      const v = verdict(dir, args);
      assert.equal(v.code, 0, `\`${args.join(" ")}\` should pass on a fresh tree`);
      assert.equal(v.payload.ok, true);
      assert.equal(v.payload.exit_code, 0);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate agrees with itself, without saying ok twice", () => {
  const dir = brokenProject();
  try {
    // Force real index drift: rename a spec directory behind the index.
    const specs = path.join(dir, ".doctrina", "specs");
    renameSync(path.join(specs, "carteira"), path.join(specs, "carteira-x"));

    const v = verdict(dir, ["validate"]);
    assert.equal(v.code, 1);
    assert.equal(v.payload.ok, false);
    assert.equal(v.payload.exit_code, 1);
    assert.ok(Array.isArray(v.payload.errors) && v.payload.errors.length > 0,
      "the data fields are unchanged");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the captured path — a command with no payload — is unchanged", () => {
  const dir = brokenProject();
  try {
    assert.equal(run(dir, ["work", "importar nota", "--title", "importa a nota",
      "--quiet"]).status, 0);
    // `analyze` fails on an unplanned change and has no payload of its own.
    const v = verdict(dir, ["analyze", "0001-importa-a-nota"]);
    assert.equal(v.code, 1);
    assert.equal(v.payload.ok, false);
    assert.equal(v.payload.exit_code, 1);
    assert.ok(Array.isArray(v.payload.stdout), "captured output still travels");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every payload still carries its own data fields", () => {
  const dir = brokenProject();
  try {
    const cov = verdict(dir, ["coverage"]).payload;
    assert.ok(cov.summary && Array.isArray(cov.specs), "coverage keeps specs + summary");
    const tr = verdict(dir, ["trace"]).payload;
    assert.ok(Array.isArray(tr.dangling) && tr.summary, "trace keeps its arrays + summary");
    for (const p of [cov, tr]) {
      assert.equal(p.$schema_version, "1.0.0");
      assert.ok(typeof p.command === "string");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
