// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { extractOps, insertOps } from "../src/lib/spec-ops.js";

// `change delta` WRITES THE OPS (change 0205).
//
// A field review of 0.17 asked for "a `doctrina delta add` command to add a
// requirement and a criterion without writing the ops blocks by hand". It
// lives under `change`, through the grammar `apply` reads (ADR 0021), and
// dry-runs the whole block against the spec before writing a byte.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

const SPEC = `# Spec — auth

**Capability:** auth
**Status:** draft
**Implementation:** planned
**Version:** 0.1.0

## Purpose

Auth.

## Requirements (EARS)

### Ubiquitous

- The system shall hash passwords.

### Event-driven

- When a user logs in, the system shall issue a token.

## Acceptance criteria

1. [unverified] a login issues a token — verified by \`test/auth.test.js\`.
`;

function setup() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-change-delta-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  assert.equal(run(["spec", "new", "auth"]).status, 0);
  writeFileSync(path.join(dir, ".doctrina", "specs", "auth", "spec.md"), SPEC);
  assert.equal(run(["index", "rebuild"]).status, 0);
  assert.equal(run(["change", "new", "0001-expiry", "Token expiry"]).status, 0);
  const delta = path.join(dir, ".doctrina", "changes", "0001-expiry", "specs", "auth", "delta.md");
  return { dir, run, delta };
}

test("flags become op lines that apply, in order, with the bump last and never doubled", () => {
  const { dir, run, delta } = setup();
  try {
    const first = run(["change", "delta", "0001-expiry", "auth",
      "--requirement", "event: When a token expires, the system shall refuse the request.",
      "--criterion", "[unverified] an expired token is refused — verified by `test/auth.test.js`",
      "--bump", "patch"]);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /created .*delta\.md — 3 ops added/);
    assert.equal(run(["change", "delta", "0001-expiry", "auth", "--bump", "minor"]).status, 0);
    assert.equal(run(["change", "delta", "0001-expiry", "auth",
      "replace-requirement", "ubiquitous", "1:", "The", "system", "shall", "salt", "and", "hash", "passwords."]).status, 0);

    const ops = extractOps(readFileSync(delta, "utf8"));
    assert.deepEqual(ops.map((o) => o.verb),
      ["append-requirement", "append-criterion", "replace-requirement", "bump-version"]);
    assert.equal(ops.at(-1).level, "minor", "the second --bump replaced the first");
    assert.match(readFileSync(delta, "utf8"), /\*\*Operation:\*\* MODIFIED/);

    // What `change delta` wrote is what `apply` applies.
    const check = run(["change", "check", "0001-expiry"]);
    assert.match(check.stdout, /4 ops would apply cleanly/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("nothing is written unless the whole block applies, and every refusal has its exit class", () => {
  const { dir, run, delta } = setup();
  try {
    const missing = run(["change", "delta", "0001-expiry", "auth", "replace-requirement ubiquitous 9: nope"]);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /would not apply .* nothing written/);
    assert.throws(() => readFileSync(delta), "no delta was created");

    assert.equal(run(["change", "delta", "0001-expiry", "auth", "--requirement", "weird: x"]).status, 2);
    assert.equal(run(["change", "delta", "0001-expiry", "auth"]).status, 2, "nothing to add");
    assert.equal(run(["change", "delta", "0001-expiry", "billing", "--bump", "minor"]).status, 2, "no spec");
    assert.equal(run(["change", "delta", "9999-nope", "auth", "--bump", "minor"]).status, 2);
    assert.equal(run(["change", "delta", "../x", "auth", "--bump", "minor"]).status, 2);

    mkdirSync(path.dirname(delta), { recursive: true });
    writeFileSync(delta, "# Spec Delta — capability: auth\n\n**Operation:** ADDED\n**Target spec on apply:** `.doctrina/specs/auth/spec.md`\n\n---\n\n# Spec\n");
    assert.equal(run(["change", "delta", "0001-expiry", "auth", "--bump", "minor"]).status, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an example block inside a comment is never the one written to", () => {
  const text = "# D\n\n<!--\n```ops\nbump-version major\n```\n-->\n\n---\n";
  const out = insertOps(text, ["bump-version patch"]);
  assert.deepEqual(extractOps(out).map((o) => `${o.verb} ${o.level}`), ["bump-version patch"]);
  assert.match(out, /<!--\n```ops\nbump-version major\n```\n-->/, "the example is left alone");
});

// Change 0228: a repeated --op, --requirement or --criterion is one op each.
// The parser kept only the last value of a repeated flag, so a command line
// asking for two removals wrote one and still reported "applies cleanly".
test("change delta writes every repeated --op, --requirement and --criterion, in order", () => {
  const { dir, run, delta } = setup();
  try {
    const r = run(["change", "delta", "0001-expiry", "auth",
      "--requirement", "event: When a token expires, the system shall refuse it.",
      "--requirement", "ubiquitous: The system shall sign tokens.",
      "--criterion", "[unverified] an expired token is refused — verified by `test/expiry.test.js`.",
      "--criterion", "[unverified] tokens are signed — verified by `test/sign.test.js`.",
      "--op", "set-criterion 1: verified",
      "--op", "replace-requirement ubiquitous 1: The system shall hash passwords with a salt.",
      "--bump", "minor"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /7 ops added/);
    const ops = extractOps(readFileSync(delta, "utf8"));
    assert.deepEqual(ops.map((o) => o.verb), [
      "append-requirement", "append-requirement", "append-criterion", "append-criterion",
      "set-criterion", "replace-requirement", "bump-version"]);
    const text = readFileSync(delta, "utf8");
    assert.ok(text.indexOf("refuse it") < text.indexOf("sign tokens"), "in the order given");
    assert.match(text, /with a salt/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Change 0228: `change check --verbose` previews an ops delta as the spec it
// produces. It used to diff the spec against the delta FILE, so every line
// of the spec printed as a removal around the few the ops change.
test("change check --verbose previews an ops delta as the spec before against the spec after", () => {
  const { dir, run } = setup();
  try {
    assert.equal(run(["change", "delta", "0001-expiry", "auth",
      "--requirement", "event: When a token expires, the system shall refuse it.", "--bump", "minor"]).status, 0);
    const out = run(["change", "check", "0001-expiry", "--verbose"]).stdout;
    const preview = out.slice(out.indexOf("deltas in full"));
    assert.match(preview, /\+\+\+ \.doctrina\/specs\/auth\/spec\.md \(after apply\)/);
    assert.match(preview, /^\+- When a token expires, the system shall refuse it\.$/m);
    assert.match(preview, /^-\*\*Version:\*\* 0\.1\.0$/m);
    assert.match(preview, /^\+\*\*Version:\*\* 0\.2\.0$/m);
    assert.doesNotMatch(preview, /^-## Purpose$/m, "unchanged spec lines are context, not removals");
    assert.doesNotMatch(preview, /fragment to merge/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Change 0232: `change check` scans the spec a delta will write. A weasel
// word in a delta used to surface only after the close had merged it.
test("change check warns, before apply, about a smell the delta writes into the spec", () => {
  const { dir, run } = setup();
  try {
    assert.equal(run(["change", "delta", "0001-expiry", "auth",
      "--requirement", "event: When a token expires, the system could refuse it after several retries."]).status, 0);
    const out = run(["change", "check", "0001-expiry"]).stdout;
    assert.match(out, /! \.doctrina\/changes\/0001-expiry\/specs\/auth\/delta\.md: writes weasel "could" into auth's spec/);
    assert.match(out, /writes vague "several" into auth's spec/);
    assert.doesNotMatch(out, /✗[^\n]*(could|several)/, "advisory: clarify is not a close gate, so the smell is a warning, never a failure");
    // A smell the spec already had is not this delta's.
    const spec = path.join(dir, ".doctrina", "specs", "auth", "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8").replace("Auth.", "Auth, which could change."));
    run(["index", "rebuild"]);
    assert.equal((run(["change", "check", "0001-expiry"]).stdout.match(/writes weasel "could"/g) ?? []).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
