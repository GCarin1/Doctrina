import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0099 — the envelope names the operation, and says so even when it
// refuses.
//
// Two halves of one contract (third audit, findings 6 and 7):
//
//   `command` ran the operation together with its arguments, so
//   `doctrina why carteira --json` answered `"command": "why carteira"` and
//   the field a consumer branches on took a different value for every
//   capability — while `next --json` documents `command`/`args` as the
//   contract to branch on. The envelope contradicted the payload it wrapped.
//
//   An unknown flag exited 2 with an EMPTY stdout. Change 0086 made the
//   envelope tell the truth about the exit code; the flag check runs before
//   the envelope exists, so whoever asked for JSON got a parse error rather
//   than `{ok: false, exit_code: 2}`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function payload(cwd, args) {
  const r = run(cwd, args);
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    assert.fail(`\`${args.join(" ")}\` produced no parseable envelope:\n${r.stdout}${r.stderr}`);
  }
  return { json, status: r.status };
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-envelope-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  return dir;
}

test("an argument lands in args, never in command", () => {
  const dir = project();
  try {
    for (const argv of [["why", "carteira"], ["show", "carteira"], ["analyze", "nope"]]) {
      const { json } = payload(dir, [...argv, "--json"]);
      assert.equal(json.command, argv[0],
        `\`${argv.join(" ")}\` named the operation "${json.command}"`);
      assert.deepEqual(json.args, argv.slice(1));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a sub-operation is the operation, and stays whole", () => {
  // `spec list` is an operation; `why carteira` is an operation and an
  // argument. Shape alone cannot tell them apart — the catalog can, which
  // is the same reason `lib/usage.js` consults it.
  const dir = project();
  try {
    const { json } = payload(dir, ["spec", "list", "--json"]);
    assert.equal(json.command, "spec list");
    assert.equal(json.args, undefined, "an operation with no arguments carries no args key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown flag still answers in JSON, and says it refused", () => {
  const dir = project();
  try {
    const { json, status } = payload(dir, ["status", "--json", "--bogus"]);
    assert.equal(status, 2, "an unknown flag is a usage error");
    assert.equal(json.ok, false);
    assert.equal(json.exit_code, 2);
    assert.equal(json.command, "status");
    assert.ok(json.stderr.some((l) => /unknown flag "--bogus"/.test(l)),
      "the refusal must say what it refused");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the envelope's ok and exit_code agree with the process, refusal included", () => {
  const dir = project();
  try {
    for (const argv of [["status"], ["validate"], ["status", "--bogus"], ["analyze", "nope"]]) {
      const { json, status } = payload(dir, [...argv, "--json"]);
      assert.equal(json.exit_code, status, `\`${argv.join(" ")}\`: envelope and process disagree`);
      assert.equal(json.ok, status === 0, `\`${argv.join(" ")}\`: ok does not match the code`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
