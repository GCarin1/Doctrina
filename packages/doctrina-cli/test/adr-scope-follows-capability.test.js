import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseAdrScope } from "../src/lib/scan.js";

// Change 0075 — an ADR follows the capability it governs.
//
// Splitting a spec is what produces this drift. Change 0054 made `authoring`
// out of `cli`; the seven ADRs the new spec cites kept pointing at `cli`, and
// the same had happened to `insight` and `scaffolding` from earlier splits.
//
// The cost was invisible because `Scope:` decided CANDIDACY and then said
// nothing about ORDER: an ADR reaching a capability through a dependency
// ranked exactly as high as one naming it, so with no `--for` query — every
// relevance term 0 — the ADR NUMBER was the only tie-break, and worst-first
// dropped the oldest decisions. `authoring` lost ADR 0005 (the playbooks for
// `intake` and `work`) and ADR 0007 (the `ops` verbs it applies) out of its
// own pack, while keeping ADRs that only reached it through `cli`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// Every (capability, ADR) pair where the spec cites the ADR, over a real tree.
function citations(root) {
  const specsDir = path.join(root, ".doctrina", "specs");
  const out = [];
  for (const e of readdirSync(specsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = path.join(specsDir, e.name, "spec.md");
    let text;
    try { text = readFileSync(p, "utf8"); } catch { continue; }
    for (const n of new Set((text.match(/ADR (\d{4})/g) ?? []).map((m) => m.slice(4)))) {
      out.push([e.name, n]);
    }
  }
  return out;
}

function scopeOf(root, num) {
  const dir = path.join(root, ".doctrina", "decisions");
  const file = readdirSync(dir).find((f) => f.startsWith(`${num}-`));
  if (!file) return undefined;
  const text = readFileSync(path.join(dir, file), "utf8");
  if (!/^-\s*\*\*Status:\*\*\s*accepted/mi.test(text)) return undefined;
  const scope = parseAdrScope(text);
  return scope.length > 0 ? scope : null; // null = global
}

// ------------------------------------------------ the invariant, on this repo

test("every ADR a spec cites names that spec's capability", () => {
  const bad = [];
  for (const [cap, num] of citations(repoRoot)) {
    const scope = scopeOf(repoRoot, num);
    if (scope === undefined || scope === null) continue; // unknown or global
    if (!scope.includes(cap)) bad.push(`${cap} cites ADR ${num} (Scope: ${scope.join(", ")})`);
  }
  assert.deepEqual(bad, [],
    `an ADR a spec cites must name that capability, or the pack gets it only by\n` +
    `dependency — the first tier the budget drops:\n  ${bad.join("\n  ")}`);
});

test("the authoring pack keeps every ADR its spec cites", () => {
  const pack = run(repoRoot, ["context", "authoring", "--concat"]);
  assert.equal(pack.status, 0, pack.stderr);
  const cited = citations(repoRoot).filter(([cap]) => cap === "authoring").map(([, n]) => n);
  assert.ok(cited.length >= 5, `expected authoring to cite several ADRs, got ${cited.length}`);
  for (const num of cited) {
    assert.match(pack.stdout, new RegExp(`ADR ${num}\\b`),
      `ADR ${num} is cited by the authoring spec but omitted from its own pack`);
  }
});

// -------------------------------------------- the ranking, on a built fixture

// Two capabilities, one depending on the other, and two ADRs: one naming the
// dependent capability, one naming only its dependency. Under a budget too
// small for both, the named one must be the survivor.
function fixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-scope-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  const spec = (cap, body) => {
    mkdirSync(path.join(dir, ".doctrina", "specs", cap), { recursive: true });
    writeFileSync(path.join(dir, ".doctrina", "specs", cap, "spec.md"),
      `# Spec — ${cap}\n\n**Capability:** ${cap}\n**Status:** active\n` +
      `**Implementation:** planned\n**Realizes:** n/a — test\n**Depends on:** ${body.deps ?? ""}\n` +
      `**Version:** 0.1.0\n\n## Purpose\n\n${body.purpose}\n`);
  };
  spec("base", { purpose: "The shared foundation everything else builds on." });
  spec("leaf", { purpose: "The capability under test.", deps: "base" });

  const adr = (num, slug, scope, filler) => {
    writeFileSync(path.join(dir, ".doctrina", "decisions", `${num}-${slug}.md`),
      `# ADR ${num} — ${slug.replace(/-/g, " ")}\n\n- **Status:** accepted\n` +
      `- **Date:** 2026-01-01\n- **Scope:** ${scope}\n- **Evidence:** n/a — test\n\n` +
      `## Context\n\n${filler}\n\n## Decision\n\nDecided.\n\n## Consequences\n\n${filler}\n`);
  };
  // The named ADR is the OLDER number, so the id tie-break alone would drop it
  // first — which is exactly the bug.
  const filler = "padding. ".repeat(400);
  adr("0001", "named-by-leaf", "leaf", filler);
  adr("0002", "named-by-base-only", "base", filler);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

test("an ADR that names the capability outranks one it only inherits", () => {
  const dir = fixture();
  try {
    // Walk the budget up until exactly one of the two ADRs still has to give
    // way. That is the moment the ranking — not the ceiling — decides, and it
    // is found rather than hard-coded so the fixture can grow without the
    // assertion quietly stopping to mean anything.
    let deciding = null;
    for (let budget = 2600; budget <= 9000 && deciding === null; budget += 100) {
      const res = run(dir, ["context", "leaf", "--concat", "--budget", String(budget)]);
      if (res.status !== 0) continue;
      // `--concat` keeps the pack on stdout and the budget report on stderr,
      // so the pack stays pipeable. Read both.
      const m = /(\d+) omitted: ([^\n]*)/.exec(res.stderr);
      if (m && Number(m[1]) === 1) deciding = { budget, omitted: m[2].trim(), stdout: res.stdout };
    }
    assert.ok(deciding, "no budget made the ranking the deciding factor — fixture too small?");
    assert.equal(deciding.omitted, "0002",
      `at budget ${deciding.budget} the ADR that only INHERITS through \`base\` must be the ` +
      `one to give way, not the one that NAMES \`leaf\` (0001 is the older number, so the ` +
      `id tie-break alone would have dropped it first — that was the bug)`);
    assert.match(deciding.stdout, /ADR 0001\b/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate reports a spec citing an ADR that does not name it", () => {
  const dir = fixture();
  try {
    // Point the leaf spec at the ADR scoped to base only.
    const p = path.join(dir, ".doctrina", "specs", "leaf", "spec.md");
    writeFileSync(p, readFileSync(p, "utf8") + "\nGoverned by ADR 0002.\n");
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);

    const before = run(dir, ["validate"]);
    const out = before.stdout + before.stderr;
    assert.match(out, /cites ADR 0002.*does not name "leaf"/s, out);

    // The remedy the finding names resolves the finding (rule C2).
    const adrPath = path.join(dir, ".doctrina", "decisions", "0002-named-by-base-only.md");
    writeFileSync(adrPath, readFileSync(adrPath, "utf8")
      .replace("- **Scope:** base", "- **Scope:** base, leaf"));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    const after = run(dir, ["validate"]);
    assert.doesNotMatch(after.stdout + after.stderr, /does not name "leaf"/,
      after.stdout + after.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a global ADR is never a scope violation", () => {
  const dir = fixture();
  try {
    const adrPath = path.join(dir, ".doctrina", "decisions", "0002-named-by-base-only.md");
    writeFileSync(adrPath, readFileSync(adrPath, "utf8").replace(/^- \*\*Scope:\*\* .*$/m, ""));
    const p = path.join(dir, ".doctrina", "specs", "leaf", "spec.md");
    writeFileSync(p, readFileSync(p, "utf8") + "\nGoverned by ADR 0002.\n");
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    const res = run(dir, ["validate"]);
    assert.doesNotMatch(res.stdout + res.stderr, /does not name/,
      "an unscoped ADR loads everywhere, so it cannot be missing from a pack");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
