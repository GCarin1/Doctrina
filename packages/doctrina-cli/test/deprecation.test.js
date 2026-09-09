import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { DEPRECATED, deprecationFor, surfaceMarkdown, OPERATIONS, COMMAND_NAMES } from "../src/lib/commands.js";

// Change 0049 — shrinking the command surface.
//
// The generated surface block has a hard 40-line budget, so that adding a
// command forces the question "what comes off?". For two releases the answer
// was "nothing" and the budget was met by compressing a whole moment onto one
// line (audit finding F23).
//
// Both retirements here are MERGES, and that is the bar: the survivor already
// produces what the retiree produced, demonstrated by comparing their output
// (ADR 0026). Usage counts can show a command is unloved; only redundancy can
// show it is unnecessary.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("`constitution` prints exactly what `prime --rules` prints", () => {
  // The merge, demonstrated rather than asserted: the same lines, from the
  // same collection. If they ever diverge, the deprecation was a loss.
  const a = runCli(["constitution"], repoRoot);
  const b = runCli(["prime", "--rules"], repoRoot);
  assert.equal(a.status, 0, a.stderr);
  assert.equal(b.status, 0, b.stderr);
  assert.equal(a.stdout, b.stdout);
  assert.match(b.stdout, /Standing rules/);
  assert.match(b.stdout, /Principles/);
  assert.match(b.stdout, /Non-goals/);
  // And the primer itself still names the ADRs without the full lists.
  const primer = runCli(["prime"], repoRoot).stdout;
  assert.match(primer, /Rules/);
  assert.doesNotMatch(primer, /Standing rules/);
});

test("`change check --verbose` prints what `change diff` printed", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-deprecate-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    assert.equal(runCli(["spec", "new", "billing"], dir).status, 0);
    assert.equal(runCli(["change", "new", "0001-x", "A change"], dir).status, 0);
    const deltaDir = path.join(dir, ".doctrina", "changes", "0001-x", "specs", "billing");
    mkdirSync(deltaDir, { recursive: true });
    writeFileSync(path.join(deltaDir, "delta.md"),
      "# Spec Delta — capability: billing\n\n**Operation:** MODIFIED\n" +
      "**Target spec on apply:** `.doctrina/specs/billing/spec.md`\n\n---\n\n" +
      "## Purpose\n\nInvoices and statements.\n");

    const diff = runCli(["change", "diff", "0001-x"], dir);
    const check = runCli(["change", "check", "0001-x", "--verbose"], dir);

    // Everything the diff showed is inside the verbose check: the target, the
    // operation, and the line diff itself.
    const body = diff.stdout.split("\n").filter((l) => l.trim() !== "");
    for (const line of body) {
      assert.ok(check.stdout.includes(line),
        `change check --verbose is missing a line change diff printed: ${JSON.stringify(line)}`);
    }
    assert.match(check.stdout, /deltas in full \(--verbose\)/);
    // And without the flag it stays the summary it was.
    const quiet = runCli(["change", "check", "0001-x"], dir);
    assert.doesNotMatch(quiet.stdout, /deltas in full/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a deprecated name keeps working and says so, on stderr", () => {
  // The warning must not touch stdout: a warning that corrupts the output it
  // warns about is a breaking change wearing a deprecation's clothes.
  const r = runCli(["constitution"], repoRoot);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /deprecated:/);
  assert.match(r.stderr, /doctrina prime --rules/);
  assert.doesNotMatch(r.stdout, /deprecated/);

  const fresh = runCli(["prime", "--rules"], repoRoot);
  assert.doesNotMatch(fresh.stderr, /deprecated:/, "the survivor must not warn");
});

test("every deprecation names a replacement that exists", () => {
  const known = new Set([...COMMAND_NAMES, ...OPERATIONS.map(([op]) => op)]);
  for (const [op, record] of Object.entries(DEPRECATED)) {
    assert.ok(known.has(op), `deprecated "${op}" is not in the catalog — it cannot be deprecated and unknown`);
    assert.match(record.use, /^doctrina /, `"${op}" must name the command to use instead`);
    assert.ok(record.why && record.since, `"${op}" must record why and since which version`);
    const replacement = record.use.replace(/^doctrina /, "").split(" ").filter((w) => !w.startsWith("-"));
    assert.ok(known.has(replacement.slice(0, 2).join(" ")) || known.has(replacement[0]),
      `"${op}" points at "${record.use}", which is not a command`);
    assert.ok(!DEPRECATED[replacement.slice(0, 2).join(" ")] && !DEPRECATED[replacement[0]],
      `"${op}" points at another deprecated command`);
  }
});

test("deprecationFor matches the operation, not a prefix of it", () => {
  assert.ok(deprecationFor(["constitution"]));
  assert.ok(deprecationFor(["change", "diff", "0001-x"]));
  assert.equal(deprecationFor(["change", "check"]), null);
  assert.equal(deprecationFor(["change"]), null);
  assert.equal(deprecationFor(["prime", "--rules"]), null);
  // Flags never decide the match.
  assert.ok(deprecationFor(["--json", "constitution"]));
});

test("the freed lines stay freed: the block is smaller than its budget", () => {
  // The point of the change. The budget is a forcing function, so the test
  // that matters is not "it fits" (it always did, by compression) but that
  // retiring a command is what made room.
  const md = surfaceMarkdown();
  assert.doesNotMatch(md, /doctrina constitution/);
  assert.doesNotMatch(md, /check\|tick\|diff/);
  assert.match(md, /doctrina prime/);
  assert.match(md, /doctrina change new\|apply\|archive\|check\|tick\|abandon/);
});

// ------------------------------- change 0061: the notice reaches the machine

// Change 0049 wrote the notice to the REAL stderr, before capture. Right for
// a piped stdout, which stays exactly what it was — but it meant the
// envelope's `stderr` array came back empty, and a consumer reading only the
// envelope never learned the name it invoked is on its way out. Deprecation
// exists so consumers migrate, and this CLI's primary consumer is an agent
// reading JSON.

test("a deprecated command carries its replacement in the JSON envelope", () => {
  const res = runCli(["constitution", "--json"], repoRoot);
  const payload = JSON.parse(res.stdout);
  assert.ok(payload.deprecated, `no deprecation in the envelope:\n${res.stdout}`);
  assert.equal(payload.deprecated.use, "doctrina prime --rules");
  assert.match(payload.deprecated.since, /^\d+\.\d+\.\d+$/, payload.deprecated.since);
  assert.ok(payload.deprecated.why.length > 0);
});

test("a deprecated two-word operation carries it too", () => {
  const res = runCli(["change", "diff", "0000-nonexistent", "--json"], repoRoot);
  const payload = JSON.parse(res.stdout);
  assert.ok(payload.deprecated, res.stdout);
  assert.equal(payload.deprecated.use, "doctrina change check --verbose");
});

test("a command that is not deprecated has no such field", () => {
  const res = runCli(["status", "--json"], repoRoot);
  const payload = JSON.parse(res.stdout);
  assert.equal("deprecated" in payload, false,
    "the field's presence is the signal; it must be absent, not null");
});

test("the deprecation does not change stdout", () => {
  // The prose notice stays on stderr and the human output is untouched: a
  // warning that corrupts the output it warns about is a breaking change
  // wearing a deprecation's clothes.
  const plain = runCli(["constitution"], repoRoot);
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stderr, /deprecated:/, plain.stderr);
  assert.doesNotMatch(plain.stdout, /deprecated:/, plain.stdout);

  const json = runCli(["constitution", "--json"], repoRoot);
  const payload = JSON.parse(json.stdout);
  assert.deepEqual(payload.stdout, plain.stdout.replace(/\n$/, "").split("\n"),
    "the captured stdout must be exactly the human output, deprecation aside");
});
