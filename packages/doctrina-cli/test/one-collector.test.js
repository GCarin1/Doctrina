import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { collectSnapshot } from "../src/lib/snapshot.js";
import { VIEWS, renderView } from "../src/lib/views.js";

// Change 0037 — one collector, several views.
//
// `status`, `prime`, `handoff` and `report` were four commands rendering the
// same three collections, and they got at them by importing functions out of
// each other's modules. A command module is a RENDERER; using one as a data
// source is how four surfaces end up able to report different numbers for the
// same tree, and it had already produced a lib -> command edge (`lib/scan.js`
// importing from `commands/skill.js`) that made the dependency graph a cycle
// waiting to happen.
//
// The tests below pin the shape of the fix, not just today's behaviour: the
// collection happens once, the views are pure functions over it, and the
// import pattern that caused the problem cannot come back.

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, "..", "src");
const cliEntry = path.join(srcDir, "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-views-"));
  const r = runCli(["init", "--non-interactive", "--project-name", "Acme"], dir);
  assert.equal(r.status, 0, r.stderr);
  return dir;
}

function jsFiles(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => path.join(dir, f));
}

// Named imports from a sibling command module — `import { x } from "./y.js"`.
// Namespace imports (`import * as y from "./y.js"`) are excluded on purpose:
// that is `close`, `watch` and `upgrade` DRIVING another command's `run()`,
// which is the documented driver pattern, not reaching into its internals.
const NAMED_SIBLING_IMPORT = /^import\s+(?!\*)\{?[^;]*?\}?\s+from\s+"\.\/[\w-]+\.js";/gm;

test("no command module imports a binding out of another command module", () => {
  const offenders = [];
  for (const file of jsFiles(path.join(srcDir, "commands"))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(NAMED_SIBLING_IMPORT)) {
      // Re-exports (`export { x } from`) are how a command publishes the lib
      // function it renders; only IMPORTS are the reach-in.
      if (m[0].startsWith("import")) offenders.push(`${path.basename(file)}: ${m[0].split("\n")[0]}`);
    }
  }
  assert.deepEqual(offenders, [],
    "a command module is a renderer — move the shared function to src/lib/ instead:\n" + offenders.join("\n"));
});

test("no library module imports from a command module", () => {
  const offenders = [];
  for (const file of jsFiles(path.join(srcDir, "lib"))) {
    const text = readFileSync(file, "utf8");
    if (/from\s+"\.\.\/commands\//.test(text)) offenders.push(path.basename(file));
  }
  assert.deepEqual(offenders, [],
    "lib/ must not depend on commands/ — that edge makes the graph a cycle waiting to happen");
});

test("every view is a pure function of the snapshot", () => {
  const dir = project();
  try {
    const snapshot = collectSnapshot(dir);
    const before = JSON.stringify(snapshot);
    for (const view of VIEWS) {
      const lines = renderView(view, snapshot, { days: 7, cutoffIso: "2026-01-01", git: null });
      assert.ok(Array.isArray(lines) && lines.length > 0, `${view} rendered nothing`);
      assert.ok(lines.every((l) => typeof l === "string"), `${view} returned a non-string line`);
    }
    assert.equal(JSON.stringify(snapshot), before, "a view mutated the snapshot it was handed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown view is refused by name, not silently defaulted", () => {
  const dir = project();
  try {
    const r = runCli(["status", "--view", "dashbored"], dir);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown view "dashbored"/);
    assert.match(r.stderr, /did you mean --view dashboard\?/);
    assert.throws(() => renderView("nope", collectSnapshot(dir)), /unknown view "nope"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("`status --view <name>` and the named command render the same bytes", () => {
  // The property the split has to preserve: four names, four shapes, one set
  // of numbers. If these ever diverge, two surfaces are describing the same
  // tree differently — the defect this change exists to remove.
  const dir = project();
  try {
    runCli(["spec", "new", "billing"], dir);
    runCli(["change", "new", "0001-x", "do a thing"], dir);
    runCli(["decision", "new", "Use Postgres"], dir);

    for (const [name, argv] of [["prime", ["prime"]], ["handoff", ["handoff"]], ["report", ["report"]]]) {
      const direct = runCli(argv, dir);
      const viaStatus = runCli(["status", "--view", name], dir);
      assert.equal(direct.status, 0, direct.stderr);
      assert.equal(viaStatus.status, 0, viaStatus.stderr);
      // handoff appends an interactive tip only on a TTY; neither run is one.
      assert.equal(viaStatus.stdout, direct.stdout, `${name} differs between its own command and --view ${name}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the four views report the same numbers because they share one collection", () => {
  const dir = project();
  try {
    // A tree with something in every collection, so a divergence would show.
    runCli(["spec", "new", "billing"], dir);
    runCli(["spec", "new", "auth"], dir);
    runCli(["change", "new", "0001-x", "do a thing"], dir);
    runCli(["skill", "new", "some-lesson"], dir);

    const outputs = ["dashboard", "prime", "handoff", "report"].map((v) => runCli(["status", "--view", v], dir).stdout);
    // Every view states the spec count; a mismatch means two collections.
    const snapshot = collectSnapshot(dir);
    assert.equal(snapshot.specs.total, 2);
    for (const out of outputs) {
      assert.ok(out.includes("2"), "each view must report the two specs it was given");
    }
    // And the open change appears in the three views that carry open work.
    for (const out of outputs.slice(1)) {
      assert.match(out, /0001-x/, "an open change must appear in every view that lists open work");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("`status --json` keeps its shape whichever view is asked for", () => {
  // The JSON envelope is a machine contract: a formatting flag must not
  // change it, or a consumer breaks the day someone renders a report.
  const dir = project();
  try {
    const plain = JSON.parse(runCli(["status", "--json"], dir).stdout);
    const withView = JSON.parse(runCli(["status", "--view", "handoff", "--json"], dir).stdout);
    assert.deepEqual(Object.keys(withView), Object.keys(plain));
    assert.equal(withView.specs.total, plain.specs.total);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Change 0043: the on-disk grammar has one owner. ──

test("the on-disk grammar lives in the document model ADR 0021 names", () => {
  // ADR 0021 declares ONE document model that owns how a Doctrina artifact is
  // read off disk. Three parsers lived outside it — skill frontmatter in a
  // command module, the two delta parsers in another — and `lib/scan.js`
  // imported them FROM `commands/`, inverting the direction the layering
  // depends on. Change 0037 broke that edge; this pins where they landed, so
  // the grammar does not scatter again into a library per parser.
  const model = readFileSync(path.join(srcDir, "lib", "doc-model.js"), "utf8");
  for (const parser of ["parseFrontmatter", "parseOperation", "parseCapabilityFromDelta", "isUntouchedScaffold"]) {
    assert.match(model, new RegExp(`export function ${parser}\\(`),
      `${parser} belongs to the document model (ADR 0021)`);
  }

  // And nothing else defines them: a second definition is the drift the ADR
  // exists to prevent, whichever directory it hides in.
  const offenders = [];
  for (const dir of ["lib", "commands"]) {
    for (const f of readdirSync(path.join(srcDir, dir))) {
      if (!f.endsWith(".js") || `${dir}/${f}` === "lib/doc-model.js") continue;
      const text = readFileSync(path.join(srcDir, dir, f), "utf8");
      for (const parser of ["parseFrontmatter", "parseOperation", "parseCapabilityFromDelta"]) {
        if (new RegExp(`^(export )?function ${parser}\\(`, "m").test(text)) offenders.push(`${dir}/${f}: ${parser}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "the grammar has one owner:\n" + offenders.join("\n"));
});
