import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseSourceGlobs } from "../src/lib/scan.js";
import { expandBraces, globToRegExp } from "../src/lib/runtime.js";
import { rankCapabilitiesByDiff, declaredOwners } from "../src/lib/work-model.js";

// Change 0077 — the review can see the code it reviews.
//
// `rankCapabilitiesByDiff` scored a file against a capability on three
// inferences: the capability name as a path segment, the spec citing the
// path, the spec citing the basename. Measured over this repository, 80 of
// 92 source files scored zero — `commands/adapter.js`, `commands/work.js`,
// `lib/gates.js` among them. `review` runs inside every `close` and is the
// gate that asks whether the spec kept up with the code; it could not see
// the code. And the "this code belongs to nobody" note only fired when the
// WHOLE diff matched nothing, so one incidental match under `docs/` silenced
// it for every other file.
//
// The fix is a DECLARATION, not a better guess (ADR 0027).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("a declared Source glob claims the file, and outranks every inference", () => {
  // `adapter.js` names no capability and no spec cites it: before the header
  // it belonged to nobody. `scaffolding` declares it.
  const owners = rankCapabilitiesByDiff(repoRoot,
    ["packages/doctrina-cli/src/commands/adapter.js"], { limit: Infinity });
  assert.deepEqual(owners.map((o) => o.id), ["scaffolding"]);
  assert.ok(owners[0].score >= 10, "a declaration scores above the inferences");
});

test("every tracked source file in this repository is DECLARED by a capability", () => {
  // The measurement the change is FOR: a coverage number, not an impression.
  // It ran at 12 of 92 before the header existed.
  //
  // Asked with `declaredOwners`, not with the ranking. The ranking falls back
  // to inferences on purpose, so a file no spec names still comes back with an
  // owner — scored 5 instead of 10 — and this test, when it asked the ranking
  // whether there was "an owning capability", answered yes for two files
  // nobody had declared: `lib/names.js` and the packed-install harness. A
  // gate for a declaration has to ask about the declaration (ADR 0027).
  const tracked = execFileSync("git",
    ["ls-files", "packages/doctrina-cli/src", "scripts", "docs", "CHANGELOG.md"],
    { cwd: repoRoot, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const undeclared = tracked.filter((f) => declaredOwners(repoRoot, f).length === 0);
  assert.deepEqual(undeclared, [], "every file is claimed by the spec that owns it");
  assert.ok(tracked.length > 100, "the measurement covers the whole tree");
});

test("an inferred owner does not read as a declared one", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-declared-"));
  try {
    assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    const spec = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    // The spec MENTIONS the file — the inference the ranking scores — and
    // declares nothing.
    writeFileSync(spec, readFileSync(spec, "utf8")
      .replace("## Purpose", "## Purpose\n\nThe balance lives in `saldo.js`.\n"));
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "saldo.js"), "export const saldo = 0;\n");

    assert.ok(rankCapabilitiesByDiff(dir, ["src/saldo.js"], { limit: 1 }).length > 0,
      "precondition: the ranking still finds it, which is why it cannot be the gate");
    assert.deepEqual(declaredOwners(dir, "src/saldo.js"), [],
      "a mention is not a declaration");

    writeFileSync(spec, readFileSync(spec, "utf8")
      .replace("**Last updated:**", "**Source:** `src/saldo.js`\n**Last updated:**"));
    assert.deepEqual(declaredOwners(dir, "src/saldo.js"), ["carteira"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the orphan note fires per file, not only when the whole diff misses", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-owner-"));
  try {
    assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", "uma carteira"]).status, 0);
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "t"], { cwd: dir });

    // One capability that claims one file, plus a second file it claims nothing
    // about. The old form went silent because the first file matched.
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    const spec = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "carteira.js"), "export const a = 1;\n");
    writeFileSync(path.join(dir, "src", "orfao.js"), "export const b = 2;\n");
    writeFileSync(spec, readFileSync(spec, "utf8")
      .replace("**Last updated:**", "**Source:** `src/carteira.js`\n**Last updated:**"));

    // A tree with history, then a working-tree change touching both files:
    // `review` reads what changed since HEAD.
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-qm", "base"], { cwd: dir });
    writeFileSync(path.join(dir, "src", "carteira.js"), "export const a = 2;\n");
    writeFileSync(path.join(dir, "src", "orfao.js"), "export const b = 3;\n");

    const out = run(dir, ["review"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /belong to no capability/);
    assert.match(out.stdout, /orfao\.js/);
    assert.doesNotMatch(out.stdout, /`src\/carteira\.js`[^\n]*belong to no capability/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate refuses a Source glob that claims code which is not there", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-owner-"));
  try {
    assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", "uma carteira"]).status, 0);
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    const spec = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8")
      .replace("**Last updated:**", "**Source:** `src/nowhere/**`\n**Last updated:**"));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);

    const out = run(dir, ["validate"]);
    assert.match(out.stdout + out.stderr, /\*\*Source:\*\* pattern `src\/nowhere\/\*\*` matches no file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the header parses as one glob per comma OUTSIDE the braces", () => {
  const globs = parseSourceGlobs("**Source:** `src/{a,b}.js`, `docs/**`\n");
  assert.deepEqual(globs, ["src/{a,b}.js", "docs/**"]);
  assert.deepEqual(expandBraces("src/{a,b}.js"), ["src/a.js", "src/b.js"]);
  const re = globToRegExp("src/{a,b}.js");
  assert.ok(re.test("src/a.js") && re.test("src/b.js"));
  assert.ok(!re.test("src/c.js"));
  // An absent, "n/a" or "—" header claims nothing — the backward-compatible
  // default for every spec written before this existed.
  assert.deepEqual(parseSourceGlobs("**Status:** active\n"), []);
  assert.deepEqual(parseSourceGlobs("**Source:** n/a — no code yet\n"), []);
  assert.deepEqual(parseSourceGlobs("**Source:** —\n"), []);
});
