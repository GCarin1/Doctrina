import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequence } from "../src/lib/gates.js";
import * as close from "../src/commands/close.js";

// Change 0060 — one answer per question.
//
// Two structural drifts the audit found together.
//
// A9: a step declared in a sequence with no runner in the driver had two
// answers. `doctor` reported it UNCHECKED and named the command; `close`
// started a second process running this same binary — the integration style
// change 0045 removed from `doctor` — down a path no declared step could
// reach, because every step has a runner and a test keeps it that way.
//
// A10: eight exports in `src/lib/` were referenced by nothing at all — not
// by their own module, not by another, not by a test. Two of them were born
// in changes 0046 and 0050. Each extraction leaves a little public surface
// with no consumer, and nothing noticed. This is the drift test that makes
// the cleanup stick, in the shape the project already uses for flags and
// commands.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(here, "..");
const repoRoot = path.resolve(cliRoot, "..", "..");

const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory()
    ? walk(path.join(dir, e.name))
    : (e.name.endsWith(".js") ? [path.join(dir, e.name)] : [])));

const EXPORTED = /^export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z_$][\w$]*)/gm;

// ------------------------------------------------ A9: the step with no runner

test("every step the close declares has a runner in the close", () => {
  // The invariant the removed fallback pretended to protect. It holds by
  // construction, which is exactly why a second answer was unreachable.
  const text = readFileSync(path.join(cliRoot, "src", "commands", "close.js"), "utf8");
  const missing = sequence("close")
    .map((s) => s.id)
    // A key in the runners table, quoted or bare — `adr-checkpoint` needs the
    // quotes, `validate` does not.
    .filter((id) => !new RegExp(`^\\s*"?${id}"?:`, "m").test(text));
  assert.deepEqual(missing, [], `close.js declares no runner for: ${missing.join(", ")}`);
});

test("the close no longer starts a second process running this same binary", () => {
  const text = readFileSync(path.join(cliRoot, "src", "commands", "close.js"), "utf8");
  assert.doesNotMatch(text, /spawnSync|spawn\(/,
    "a driver reports the gap in its own file; it does not shell out to itself (change 0045)");
  assert.match(text, /function missingRunner/,
    "and it answers a runnerless step the way doctor does: report it");
});

test("close and doctor give the same answer for a step with no runner", () => {
  const closeText = readFileSync(path.join(cliRoot, "src", "commands", "close.js"), "utf8");
  const doctorText = readFileSync(path.join(cliRoot, "src", "commands", "doctor.js"), "utf8");
  for (const [name, text] of [["close", closeText], ["doctor", doctorText]]) {
    assert.match(text, /declared in the (close sequence|doctor sequence)/,
      `${name} must say the step is declared and unimplemented, not run it elsewhere`);
  }
  assert.ok(typeof close.run === "function");
});

// -------------------------------------------- A10: an export with no consumer

// Every reference to `name` outside its own declaration, anywhere the CLI's
// own code, its tests, or the repository's scripts can reach.
function consumers(name, ownFile, files) {
  const re = () => new RegExp(`\\b${name}\\b`, "g");
  const own = (readFileSync(ownFile, "utf8").match(re()) ?? []).length > 1;
  const src = [];
  const proof = [];
  for (const f of files) {
    if (f === ownFile) continue;
    if (!re().test(readFileSync(f, "utf8"))) continue;
    (f.includes(`${path.sep}test${path.sep}`) || f.includes(`${path.sep}scripts${path.sep}`)
      ? proof
      : src).push(path.relative(repoRoot, f));
  }
  return { own, src, proof };
}

test("no export in src/lib/ is referenced by nothing at all", () => {
  const libFiles = walk(path.join(cliRoot, "src", "lib"));
  const searched = [
    ...walk(path.join(cliRoot, "src")),
    ...walk(path.join(cliRoot, "test")),
    ...walk(path.join(repoRoot, "scripts")),
  ];

  const dead = [];
  const proofOnly = [];
  for (const file of libFiles) {
    for (const m of readFileSync(file, "utf8").matchAll(EXPORTED)) {
      const name = m[1];
      const { own, src, proof } = consumers(name, file, searched);
      const rel = `${path.relative(cliRoot, file)} :: ${name}`;
      if (!own && src.length === 0 && proof.length === 0) dead.push(rel);
      // A seam a test reaches for is a consumer — it is how the behaviour is
      // proven. It is reported apart from dead surface, never as a failure.
      else if (!own && src.length === 0) proofOnly.push(rel);
    }
  }

  assert.deepEqual(dead, [],
    `these exports have no consumer anywhere — un-export or delete them:\n  ${dead.join("\n  ")}`);
  assert.ok(proofOnly.length > 0,
    "test-only seams exist and are allowed; if this ever hits zero the classifier broke");
});

test("the drift test catches a newly orphaned export", () => {
  // Feed the classifier a name nothing in the tree mentions, using the same
  // path it uses for real: a gate nobody has watched fail is a gate nobody
  // knows works.
  const libFile = path.join(cliRoot, "src", "lib", "ledger.js");
  const searched = [
    ...walk(path.join(cliRoot, "src")),
    ...walk(path.join(cliRoot, "test")),
  ];
  // Assembled at runtime so the name never appears literally in this file,
  // which the classifier searches like any other.
  const orphan = ["aName", "Nothing", "Mentions"].join("");
  const { own, src, proof } = consumers(orphan, libFile, searched);
  assert.equal(own, false);
  assert.deepEqual(src, []);
  assert.deepEqual(proof, []);
});
