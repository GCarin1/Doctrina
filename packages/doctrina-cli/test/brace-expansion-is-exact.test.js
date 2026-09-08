import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { expandBraces, globToRegExp } from "../src/lib/runtime.js";
import { rankCapabilitiesByDiff } from "../src/lib/work-model.js";

// Change 0084 — brace expansion says what it means.
//
// Two defects in the glob dialect change 0077 added, found by auditing that
// change's own code:
//
//   1. `globToRegExp` computed the expansion and then used it only when it
//      produced MORE than one alternative — so `src/{a}.js` fell through and
//      compiled the original, braces and all, matching nothing. Noisy rather
//      than silent: `validate` reports a pattern that matches no file.
//   2. `expandBraces` closed on the first `}` rather than the matching one,
//      so `src/{a,{b,c}}.js` expanded to ["a}", "b", "c}"] — matching `b`,
//      missing `a` and `c`, inventing `a}`. Silent, because SOMETHING
//      matched and the dead-pattern check stayed quiet over a declaration
//      that covered a third of what it claimed.
//
// A `**Source:**` header is an assertion about which code belongs to whom,
// and `review` decides from it. A quiet partial match is precisely the
// failure ADR 0027 exists to remove.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const matches = (glob, file) => globToRegExp(glob).test(file);

test("a one-element group matches what it names", () => {
  assert.deepEqual(expandBraces("src/{a}.js"), ["src/a.js"]);
  assert.equal(matches("src/{a}.js", "src/a.js"), true);
  assert.equal(matches("src/{a}.js", "src/b.js"), false);
});

test("nested groups expand to exactly the alternatives they describe", () => {
  assert.deepEqual(expandBraces("src/{a,{b,c}}.js"),
    ["src/a.js", "src/b.js", "src/c.js"]);
  for (const f of ["src/a.js", "src/b.js", "src/c.js"]) {
    assert.equal(matches("src/{a,{b,c}}.js", f), true, `${f} should match`);
  }
  assert.equal(matches("src/{a,{b,c}}.js", "src/d.js"), false);
  // And the invented alternative is gone.
  assert.equal(matches("src/{a,{b,c}}.js", "src/a}.js"), false);
});

test("a comma inside a nested group belongs to that group", () => {
  assert.deepEqual(expandBraces("{x,{y,z}}/f.js"), ["x/f.js", "y/f.js", "z/f.js"]);
  assert.deepEqual(expandBraces("a/{b,c}/{d,e}.js"),
    ["a/b/d.js", "a/b/e.js", "a/c/d.js", "a/c/e.js"]);
});

test("an unmatched brace matches nothing, and is never a partial match", () => {
  // The braces compile as literal characters, so the pattern matches no real
  // path and `validate`'s dead-pattern check reports it — which is the point:
  // a malformed declaration must be visible, not quietly cover less.
  assert.deepEqual(expandBraces("src/{a,b.js"), ["src/{a,b.js"]);
  assert.equal(matches("src/{a,b.js", "src/a.js"), false);
  assert.equal(matches("src/{a,b.js", "src/b.js"), false);
});

test("the patterns that already worked are unchanged", () => {
  assert.equal(matches("src/*.js", "src/a.js"), true);
  assert.equal(matches("src/*.js", "src/deep/a.js"), false);
  assert.equal(matches("docs/**", "docs/en/cli-reference.md"), true);
  assert.equal(matches("a/**/z.js", "a/b/c/z.js"), true);
  assert.equal(matches("src/?.js", "src/a.js"), true);
  assert.equal(matches("src/?.js", "src/ab.js"), false);
});

test("a nested Source declaration claims every file it names", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-braces-"));
  try {
    assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", "uma carteira"]).status, 0);
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    mkdirSync(path.join(dir, "src"), { recursive: true });
    for (const f of ["a.js", "b.js", "c.js"]) {
      writeFileSync(path.join(dir, "src", f), "export const x = 1;\n");
    }
    const spec = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8")
      .replace("**Last updated:**", "**Source:** `src/{a,{b,c}}.js`\n**Last updated:**"));

    for (const f of ["src/a.js", "src/b.js", "src/c.js"]) {
      assert.deepEqual(rankCapabilitiesByDiff(dir, [f], { limit: 1 }).map((o) => o.id),
        ["carteira"], `${f} must be claimed by the spec that names it`);
    }
    // And the declaration is live, not dead.
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    assert.doesNotMatch(run(dir, ["validate"]).stdout, /matches no file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's own Source declarations still resolve", () => {
  const repoRoot = path.resolve(here, "..", "..", "..");
  const out = run(repoRoot, ["validate"]);
  assert.doesNotMatch(out.stdout + out.stderr, /\*\*Source:\*\* pattern .* matches no file/);
});
