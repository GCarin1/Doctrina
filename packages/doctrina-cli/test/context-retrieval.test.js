import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadConfig } from "../src/lib/config.js";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  fitToBudget, relevance, compareRank, queryTerms, changeSummary,
  DEFAULT_BUDGET, TIER,
} from "../src/commands/context.js";
import { parseAdrScope, adrSummary, deriveIndex } from "../src/lib/scan.js";

// M4 / ADR 0022. ADRs are immutable and never retire, so before this the
// default context pack grew with the project's AGE rather than with the
// task: `doctrina context cli` on this repo was 23 files and ~37,900
// tokens, of which 20 accepted ADRs were ~26,200 — 69% of the pack, none
// of it selected for the task at hand. These tests pin the three
// mechanisms that bound it: scope, budget, and graceful degradation.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8" });
}

// Every capability the index knows about. Read, never listed: three of these
// packs exist because a spec was split, and each split used to leave a
// hardcoded list here one capability short of the tree it was checking.
function capabilities() {
  const idx = JSON.parse(readFileSync(path.join(repoRoot, ".doctrina", "index.json"), "utf8"));
  return idx.artifacts.specs.map((s) => s.id).sort();
}

function tokensOf(stdout) {
  const m = stdout.match(/~(\d+) tokens total/);
  return m ? Number.parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------- scope

test("an ADR's Scope: header parses; absent, n/a and — all mean global", () => {
  const withScope = "# ADR 0001 — X\n\n- **Status:** accepted\n- **Scope:** billing, reporting\n";
  assert.deepEqual(parseAdrScope(withScope), ["billing", "reporting"]);

  for (const line of ["", "- **Scope:** n/a\n", "- **Scope:** —\n"]) {
    const text = `# ADR 0001 — X\n\n- **Status:** accepted\n${line}`;
    assert.deepEqual(parseAdrScope(text), [], `expected global for: ${JSON.stringify(line)}`);
  }
});

test("an unscoped ADR appears in EVERY scoped pack", () => {
  // The backward-compatibility guarantee: scoping is opt-in, so a project
  // that never adds a Scope: header sees exactly the pack it saw before.
  const unscoped = [];
  for (const dec of JSON.parse(readFileSync(path.join(repoRoot, ".doctrina", "index.json"), "utf8"))
    .artifacts.decisions) {
    if (dec.status === "accepted" && !dec.scope) unscoped.push(path.basename(dec.path));
  }
  assert.ok(unscoped.length > 0, "this repo must keep some deliberately global ADRs");

  // The guarantee is about SCOPE, so it is measured with the budget out of the
  // way. Scope must never exclude a global ADR from a pack; the budget may
  // still drop one when the tree cannot fit, which is ADR 0022 working, not
  // scoping failing — and a tree with a large open backlog does exactly that.
  for (const cap of ["cli", "gates", "skills"]) {
    const out = run(repoRoot, ["context", cap, "--budget", "60000"]).stdout;
    for (const file of unscoped) {
      assert.match(out, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `unscoped ADR ${file} is excluded from the "${cap}" pack by SCOPE, not by budget`);
    }
  }
});

test("under budget pressure a global ADR gives way only after an inherited one", () => {
  // The ordering that makes `Scope:` mean something (change 0075): an ADR that
  // NAMES a capability outranks an unscoped one — declared to belong in every
  // pack — which outranks one merely reaching it through a dependency.
  const scopeOf = (file) => {
    const text = readFileSync(path.join(repoRoot, ".doctrina", "decisions", file), "utf8");
    const m = /^-\s*\*\*Scope:\*\*\s*(.+)$/m.exec(text);
    return m ? m[1].split(",").map((x) => x.trim()) : null;
  };
  const out = run(repoRoot, ["context", "gates"]).stdout
    + run(repoRoot, ["context", "gates"]).stderr;
  const m = /\d+ omitted: ([^\n]*)/.exec(out);
  if (!m) return; // nothing dropped — nothing to order
  const dropped = m[1].split(",").map((x) => x.trim());
  const files = readdirSync(path.join(repoRoot, ".doctrina", "decisions"));
  let sawNamed = false;
  for (const num of dropped) {
    const file = files.find((f) => f.startsWith(`${num}-`));
    if (!file) continue;
    const scope = scopeOf(file);
    const named = scope !== null && scope.includes("gates");
    if (named) sawNamed = true;
    else if (sawNamed) {
      assert.fail(`ADR ${num} does not name "gates" yet survived past one that does — ` +
        `drop order was: ${dropped.join(", ")}`);
    }
  }
});

test("a scoped ADR joins only the packs of the capabilities it governs", () => {
  const decisions = JSON.parse(readFileSync(path.join(repoRoot, ".doctrina", "index.json"), "utf8"))
    .artifacts.decisions;
  const scoped = decisions.find((d) => d.status === "accepted" && d.scope?.length === 1);
  assert.ok(scoped, "this repo must carry at least one single-capability ADR");

  const governed = run(repoRoot, ["context", scoped.scope[0]]).stdout;
  assert.match(governed, new RegExp(path.basename(scoped.path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const other = capabilities().find((cap) => !scoped.scope.includes(cap));
  const excluded = run(repoRoot, ["context", other]).stdout;
  assert.doesNotMatch(excluded, new RegExp(path.basename(scoped.path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `ADR ${scoped.id} is scoped to ${scoped.scope[0]} but still loaded into the "${other}" pack`);
});

// --------------------------------------------------------------- budget

test("the scoped pack for every capability fits this project's budget", () => {
  // The audit's acceptance number: `context cli` below the ceiling. It was
  // ~37,900 against 15,000. The bar is "fits the ceiling this project
  // declares", not a literal — the ceiling is an INPUT budget a project is
  // meant to be able to raise (the contract says so, and `analyze` refuses a
  // raise of an OUTPUT budget and deliberately does not refuse this one).
  // Asserting the shipped default here would measure a number this tree no
  // longer uses.
  const budget = loadConfig(repoRoot).context_budget;
  for (const cap of capabilities()) {
    const res = run(repoRoot, ["context", cap]);
    const total = tokensOf(res.stdout);
    assert.ok(total !== null, `no token total reported for "${cap}"`);
    assert.ok(total <= budget,
      `pack for "${cap}" is ~${total} tokens, over this project's ${budget} ceiling`);
    assert.equal(res.status, 0, `context ${cap} exited ${res.status}`);
  }
});

test("the ceiling has one home: config.json and the contract agree", () => {
  // Two homes for one number is how every count in this repository has ever
  // drifted (change 0059). Raising the ceiling stays a deliberate, visible
  // act because both places have to move together.
  const configured = loadConfig(repoRoot).context_budget;
  const contract = readFileSync(
    path.join(repoRoot, ".doctrina", "contracts", "system.md"), "utf8");
  const row = /\|\s*context-pack\s*\|\s*input\s*\|\s*(\d+)\s*\|/.exec(contract);
  assert.ok(row, "the system contract must declare the context-pack budget");
  assert.equal(Number(row[1]), configured,
    `the contract declares ${row[1]} and .doctrina/config.json configures ${configured}`);
  // And the shipped default is still what an adopting project gets.
  assert.equal(DEFAULT_BUDGET, 15000);
});

test("--budget never returns a pack over the ceiling, and reports what it gave up", () => {
  // The promise is "degrading and reporting rather than SILENTLY
  // exceeding": below the irreducible core there is no pack that fits, and
  // saying so is the correct answer — refusing to say so is not.
  for (const budget of [20000, 15000, 13000, 6000]) {
    const res = run(repoRoot, ["context", "cli", "--budget", String(budget)]);
    const total = tokensOf(res.stdout);
    assert.ok(total !== null, `no token total reported at --budget ${budget}`);
    if (total <= budget) {
      assert.equal(res.status, 0, `a pack that fits must exit 0 (--budget ${budget})`);
      assert.match(res.stdout, /within budget/);
    } else {
      assert.equal(res.status, 1, `a pack that cannot fit must exit 1 (--budget ${budget})`);
      assert.match(res.stdout, /over budget/, "exceeding the budget must never be silent");
    }
  }
});

test("a tighter budget never yields a bigger pack", () => {
  let previous = Infinity;
  for (const budget of [20000, 15000, 14000, 13000]) {
    const total = tokensOf(run(repoRoot, ["context", "cli", "--budget", String(budget)]).stdout);
    assert.ok(total <= previous, `--budget ${budget} produced ~${total}, larger than the looser budget's ~${previous}`);
    previous = total;
  }
});

test("a budget the core cannot meet is reported and exits 1, never silently exceeded", () => {
  const res = run(repoRoot, ["context", "cli", "--budget", "500"]);
  assert.equal(res.status, 1, "an unmeetable budget must fail, not pretend");
  assert.match(res.stdout, /over budget/);
  assert.match(res.stdout, /nothing further can be given up/);
  // It must say WHY it cannot shrink further, and how to proceed.
  assert.match(res.stdout, /core/);
  assert.match(res.stdout, /--budget \d+/);
});

test("--budget rejects a non-numeric or non-positive ceiling as a usage error", () => {
  for (const bad of ["nope", "0", "-100"]) {
    const res = run(repoRoot, ["context", "--budget", bad]);
    assert.equal(res.status, 2, `--budget ${bad} should be a usage error, got ${res.status}`);
  }
});

// ---------------------------------------------------------- degradation

// A pack built by hand, so the ladder is tested on its own terms rather
// than through whatever this repo happens to contain today.
function fixture() {
  const item = (rel, tier, tokens, rank, extra = {}) => ({
    rel, tier, tokens, rank, lines: 1, degraded: false,
    title: rel, summary: "One sentence.", ...extra,
  });
  return [
    item("AGENTS.md", TIER.CORE, 1000, []),
    item(".doctrina/specs/a/spec.md", TIER.SPEC, 2000, [0, 1, 5]),
    item(".doctrina/specs/b/spec.md", TIER.SPEC, 2000, [1, 2, 9]),
    item(".doctrina/decisions/0001-a.md", TIER.DECISION, 900, [0, 0, 0, 1], { adrId: "0001" }),
    item(".doctrina/decisions/0002-b.md", TIER.DECISION, 900, [0, 0, 0, 2], { adrId: "0002" }),
    item(".doctrina/decisions/0003-c.md", TIER.DECISION, 900, [1, 0, 0, 3], { adrId: "0003" }),
  ];
}

test("degradation is deterministic: same tree, same budget, same pack", () => {
  const shape = (pack) => pack.map((i) => `${i.rel}:${i.degraded ? "sum" : "full"}:${i.dropped ? "out" : "in"}`);
  const budget = 4000;
  const a = fixture(); fitToBudget(a, budget);
  const b = fixture(); fitToBudget(b, budget);
  assert.deepEqual(shape(a), shape(b));

  // And the same through the real command, twice.
  const one = run(repoRoot, ["context", "cli"]).stdout;
  const two = run(repoRoot, ["context", "cli"]).stdout;
  assert.equal(one, two);
});

test("the ladder degrades everything before it drops anything", () => {
  // A decision reduced to one sentence still carries the decision; an
  // omitted one carries nothing. An earlier ordering dropped all twenty
  // ADRs to keep the specs whole, then had to summarise the specs anyway.
  const pack = fixture();
  const fit = fitToBudget(pack, 3000);
  const dropped = pack.filter((i) => i.dropped);
  const full = pack.filter((i) => !i.dropped && !i.degraded && i.tier !== TIER.CORE);
  assert.equal(full.length, 0,
    `dropped ${dropped.length} artifact(s) while ${full.length} were still at full size`);
  assert.ok(fit.summarised.length > 0);
});

test("the ladder gives up the least relevant first, and never touches the core", () => {
  // 7700 total; summarising the least relevant ADR alone brings it under
  // 7000, so exactly one artifact should have given anything up.
  const pack = fixture();
  const fit = fitToBudget(pack, 7000);
  assert.equal(fit.summarised.length, 1, "the ladder must stop as soon as the pack fits");
  const byRel = Object.fromEntries(pack.map((i) => [i.rel, i]));
  // Lowest rank goes first: 0001 before 0002 before 0003.
  assert.ok(byRel[".doctrina/decisions/0001-a.md"].degraded,
    "the least relevant ADR must be the first to degrade");
  assert.ok(!byRel[".doctrina/decisions/0003-c.md"].degraded,
    "the most relevant ADR must survive at full size the longest");
  // The core is never degraded and never dropped.
  assert.ok(!byRel["AGENTS.md"].degraded && !byRel["AGENTS.md"].dropped);
});

test("a degraded ADR keeps its title, its decision, and a pointer to the full text", () => {
  // 13000 sits between this pack's irreducible core and its full size, so
  // some ADRs degrade and the pack still fits — the case where a summary is
  // actually what the reader receives.
  const res = run(repoRoot, ["context", "cli", "--budget", "13000", "--concat"]);
  assert.match(res.stdout, /summarised to fit the context budget — full text: /,
    "a degraded artifact must say so and point at what it replaced");
});

test("an ADR summary is one sentence of the Decision section, not the whole file", () => {
  const text = [
    "# ADR 0009 — A choice", "", "- **Status:** accepted", "",
    "## Context", "", "Some long背景 that is not the decision.", "",
    "## Decision", "", "<!-- a comment -->", "",
    "We use JWT with RS256. Everything else follows from that.", "",
    "## Consequences", "", "**Positive**", "", "- fine",
  ].join("\n");
  assert.equal(adrSummary(text), "We use JWT with RS256.");
  assert.equal(adrSummary("# ADR 0001 — X\n\n- **Status:** accepted\n"), null);
});

// ------------------------------------------------------------- retrieval

test("--for ranks by term coverage, not by document length", () => {
  // The length bias that makes naive retrieval useless: a 473-line spec
  // matches more terms than a 124-line one purely by being longer.
  const terms = queryTerms("write a skill from git history");
  const long = "write ".repeat(400) + "git ".repeat(400) + " history ";
  const short = "skill git history write";
  assert.equal(compareRank(relevance(long, terms), relevance(short, terms, "skills")) < 0, true,
    "the shorter document that names the capability must outrank the longer one");
});

test("--for pulls the capability the task is about into the pack at full size", () => {
  const cases = [
    ["write a skill from git history", "skills"],
    ["add a new gate that checks exit codes", "gates"],
  ];
  for (const [query, expected] of cases) {
    const out = run(repoRoot, ["context", "--for", query]).stdout;
    const line = out.split("\n").find((l) => l.includes(`specs/${expected}/spec.md`));
    assert.ok(line, `no line for specs/${expected}`);
    assert.doesNotMatch(line, /summary/,
      `"${query}" should have kept ${expected} at full size, got: ${line.trim()}`);
  }
});

test("queryTerms drops connective words and keeps every domain term", () => {
  // Since change 0040 this is the SHARED lexicon `work` ranks with too, and it
  // drops the verbs every prompt carries — "add", "new", "create",
  // "implementar" — alongside the grammar. They are connective tissue for
  // retrieval: neither says anything about WHICH capability a prompt is about,
  // and keeping them let a long spec win on volume.
  assert.deepEqual(queryTerms("add a new gate for the exit codes"), ["gate", "exit", "codes"]);
  assert.deepEqual(queryTerms(""), []);
  assert.deepEqual(queryTerms(undefined), []);
  // Domain terms survive, in either language, accents folded.
  assert.deepEqual(queryTerms("exportação de invoice"), ["exportacao", "invoice"]);
});

test("--for with no usable terms is a usage error, not an empty pack", () => {
  const res = run(repoRoot, ["context", "--for", "the and of"]);
  assert.equal(res.status, 2);
});

// ----------------------------------------------------------- the config

test("context_budget is read from index.json and survives an index rebuild", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-budget-"));
  try {
    run(tmp, ["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"]);
    const indexPath = path.join(tmp, ".doctrina", "index.json");

    // A project that never set one gets the default — the pre-change tree.
    const before = JSON.parse(readFileSync(indexPath, "utf8"));
    assert.equal(before.config, undefined, "init must not write a config block nobody asked for");
    assert.match(run(tmp, ["context"]).stdout, new RegExp(`of ${DEFAULT_BUDGET} tokens`));

    // Setting one takes effect...
    before.config = { context_budget: 4321 };
    writeFileSync(indexPath, JSON.stringify(before, null, 2) + "\n");
    assert.match(run(tmp, ["context"]).stdout, /of 4321 tokens/);

    // ...and `index rebuild` must not erase it. deriveIndex builds the
    // graph from disk, so a setting it does not explicitly carry is gone
    // on the next rebuild — silently, and only noticed as a budget that
    // reverted to the default.
    run(tmp, ["index", "rebuild"]);
    assert.equal(JSON.parse(readFileSync(indexPath, "utf8")).config?.context_budget, 4321);
    assert.match(run(tmp, ["context"]).stdout, /of 4321 tokens/);

    // --budget still wins over the project's setting.
    assert.match(run(tmp, ["context", "--budget", "7777"]).stdout, /of 7777 tokens/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a pre-change tree with no config block reads and rebuilds unchanged", () => {
  // Ground rule: no on-disk format change without a test that reads a tree
  // written before it. `config` is optional and absence means defaults, so
  // the migration is a no-op — this proves it rather than assuming it.
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-prechange-"));
  try {
    mkdirSync(path.join(tmp, ".doctrina", "decisions"), { recursive: true });
    mkdirSync(path.join(tmp, ".doctrina", "specs", "billing"), { recursive: true });
    const legacy = {
      $schema_version: "0.1.0",
      project: "Legacy",
      framework_version: "0.12.0",
      last_updated: "2026-01-01",
      artifacts: {
        product: { path: ".doctrina/product.md", status: "active", version: "0.1.0", last_updated: "2026-01-01" },
        specs: [], decisions: [], changes: [], changes_archive: [], skills: [], contracts: [],
      },
    };
    writeFileSync(path.join(tmp, ".doctrina", "index.json"), JSON.stringify(legacy, null, 2) + "\n");
    writeFileSync(path.join(tmp, ".doctrina", "product.md"), "# Product\n\n**Status:** active\n");
    writeFileSync(path.join(tmp, ".doctrina", "specs", "billing", "spec.md"),
      "# Spec — billing\n\n**Capability:** billing\n**Status:** active\n**Version:** 0.1.0\n\n## Purpose\n\nBill people.\n");
    // An ADR with no Scope: header — the pre-change shape.
    writeFileSync(path.join(tmp, ".doctrina", "decisions", "0001-legacy.md"),
      "# ADR 0001 — Legacy choice\n\n- **Status:** accepted\n- **Date:** 2026-01-01\n\n## Decision\n\nWe did the thing.\n");
    writeFileSync(path.join(tmp, "AGENTS.md"), "# AGENTS.md\n\nRules.\n");

    const derived = deriveIndex(tmp, legacy);
    assert.equal(derived.config, undefined, "no config must be invented for a tree that had none");
    const adr = derived.artifacts.decisions[0];
    assert.equal(adr.scope, undefined, "an unscoped ADR must stay unscoped");
    assert.equal(adr.summary, "We did the thing.", "the summary is derived, not migrated");

    // And it still lands in the scoped pack, because unscoped is global.
    const out = run(tmp, ["context", "billing"]).stdout;
    assert.match(out, /0001-legacy\.md/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// --------------------------------------------------- skill ranking (0029)
//
// Skills were listed alphabetically, which is the wrong order for a list
// whose whole job is "fire the right one": on a diagnostic task the agent
// read four specs and still never learned that CI injects an empty string,
// because the skill that said so sat at the bottom under `z`.

function skillProject() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-skillrank-"));
  const res = spawnSync(process.execPath, [cliEntry, "init", "--project-description", "fixture"], {
    cwd: tmp, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(res.status, 0, res.stderr);
  const skills = path.join(tmp, ".doctrina", "skills");
  mkdirSync(skills, { recursive: true });
  const write = (name, description, when) => writeFileSync(
    path.join(skills, `${name}.md`),
    `---\nname: ${name}\ndescription: ${description}\nwhen: ${when}\n---\n\n# Skill — ${name}\n`,
  );
  // Alphabetically first, and irrelevant to the query below.
  write("aaa-billing", "How to price an invoice line", "The task changes invoice pricing or tax rules.");
  // Alphabetically last, and the one that matters.
  write("zzz-ci-empty", "Why a green CI job can have run nothing",
    "A CI workflow reports 0 scenarios, or an env var arrives empty from vars/secrets.");
  return tmp;
}

test("a skill whose trigger matches the task is ranked first and marked", () => {
  const tmp = skillProject();
  try {
    const out = run(tmp, ["context", "--for", "the CI workflow env var arrives empty and 0 scenarios ran"]).stdout;
    const section = out.slice(out.indexOf("On-demand skills"));
    assert.match(section, /READ THESE FIRST/);
    // The matching skill must precede the alphabetically-first one.
    assert.ok(
      section.indexOf("zzz-ci-empty") < section.indexOf("aaa-billing"),
      `matching skill was not hoisted:\n${section}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("with no query, skills keep their stable alphabetical order", () => {
  const tmp = skillProject();
  try {
    const out = run(tmp, ["context"]).stdout;
    const section = out.slice(out.indexOf("On-demand skills"));
    assert.doesNotMatch(section, /READ THESE FIRST/);
    assert.ok(section.indexOf("aaa-billing") < section.indexOf("zzz-ci-empty"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a query matching no skill leaves the list unranked and unmarked", () => {
  const tmp = skillProject();
  try {
    const out = run(tmp, ["context", "--for", "rewrite the onboarding copy"]).stdout;
    const section = out.slice(out.indexOf("On-demand skills"));
    assert.doesNotMatch(section, /READ THESE FIRST/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ------------------------------------------------- backlog (change 0035)
//
// Open changes used to be irreducible CORE, so the SIZE OF THE QUEUE
// decided whether the read path worked: 21 parked changes took this
// repository's packs from 95% of the ceiling to 230% of it and `context`
// started exiting 1. A project must never be blocked by having planned
// work, so a parked change is now one degradable queue line and only the
// change actually being worked on stays whole.

const TOPICS = [
  "quota", "retry", "webhook", "cursor", "ledger", "digest", "throttle",
  "beacon", "manifest", "shard", "envelope", "cascade", "harness", "lattice",
  "prism", "quarry", "ripple", "sonar", "tundra", "vellum",
];

function backlogProject(count) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-backlog-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  for (let i = 1; i <= count; i += 1) {
    // Each change gets a distinctive noun, so a query can pick ONE out.
    // Without it every change reads the same and the tie rule (correctly)
    // refuses to choose — which is its own test below.
    const topic = TOPICS[(i - 1) % TOPICS.length];
    const id = `${String(i).padStart(4, "0")}-${topic}-work`;
    assert.equal(run(dir, ["change", "new", id, `${topic} work`]).status, 0);
    const changeDir = path.join(dir, ".doctrina", "changes", id);
    // A parked change is PLANNED: real prose and real tasks, unchecked.
    writeFileSync(path.join(changeDir, "proposal.md"),
      `# Change ${id} — ${topic} work\r\n\r\n- **Status:** proposed\r\n\r\n` +
      "## Why\r\n\r\n" +
      `The ${topic} needs work, at enough length to be worth summarising. `.repeat(12) +
      "\r\n\r\n## What\r\n\r\n" +
      `The shape of the ${topic} change. `.repeat(12) + "\r\n");
    writeFileSync(path.join(changeDir, "tasks.md"),
      `# Tasks — Change ${id}\r\n\r\n- [ ] first ${topic} step\r\n- [x] second ${topic} step\r\n`);
    const deltaDir = path.join(changeDir, "specs", "core");
    mkdirSync(deltaDir, { recursive: true });
    writeFileSync(path.join(deltaDir, "delta.md"),
      "# Spec Delta — capability: core\r\n\r\n**Operation:** MODIFIED\r\n" +
      "**Target spec on apply:** `.doctrina/specs/core/spec.md`\r\n\r\n---\r\n\r\n" +
      `The delta body for the ${topic}. `.repeat(20) + "\r\n");
  }
  return dir;
}

test("a backlog of open changes never pushes a pack over its budget", () => {
  const dir = backlogProject(20);
  try {
    const res = run(dir, ["context"]);
    assert.equal(res.status, 0, "a planned backlog must not make the pack unassemblable");
    const total = tokensOf(res.stdout);
    assert.ok(total <= DEFAULT_BUDGET, `pack is ~${total} tokens, over the ${DEFAULT_BUDGET} default`);
    // Every change is still PRESENT — work in flight is never invisible.
    for (const topic of ["quota", "ledger", "vellum"]) {
      assert.match(res.stdout, new RegExp(`${topic}-work`), `the ${topic} change vanished from the pack`);
    }

    // And under a ceiling this backlog cannot meet whole, it shortens the
    // queue and says so, instead of exiting 1 the way it used to.
    const tight = run(dir, ["context", "--budget", "6000"]);
    assert.equal(tight.status, 0, "a backlog must shorten, not block");
    assert.match(tight.stdout, /parked change/, "the report must name what it shortened");
    assert.ok(tokensOf(tight.stdout) <= 6000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a parked change is one queue line; only the change in focus stays whole", () => {
  const dir = backlogProject(20);
  try {
    const out = run(dir, ["context", "--for", "the throttle is wrong"]).stdout;
    const lines = out.split("\n").filter((l) => /open change:/.test(l));

    const focus = lines.filter((l) => l.includes("0007-throttle-work"));
    assert.equal(focus.length, 3, "the change in focus keeps its proposal, tasks and delta");
    for (const l of focus) assert.doesNotMatch(l, /summary/, `focus must not degrade: ${l.trim()}`);

    const parked = lines.filter((l) => l.includes("0012-cascade-work"));
    assert.equal(parked.length, 1, "a parked change is ONE entry, not three documents");
    assert.match(parked[0], /parked/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a tie is not a focus: with nothing to choose on, no change is exempt", () => {
  const dir = backlogProject(20);
  try {
    // Every change carries a `core` delta, so naming the capability matches
    // all twenty equally. Picking the lowest-numbered one would silently
    // decide what the reader is working on.
    const lines = run(dir, ["context", "core"]).stdout.split("\n").filter((l) => /open change:/.test(l));
    assert.ok(lines.length > 0);
    assert.ok(lines.every((l) => l.includes("(parked)")),
      "an ambiguous match must leave every change in the queue");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("changeSummary says what each file of a change is worth in one line", () => {
  const proposal = "# Change 0001-x — x\r\n\r\n- **Status:** applied\r\n\r\n## Why\r\n\r\nBecause the parser broke.\r\n";
  assert.match(changeSummary(".doctrina/changes/0001-x/proposal.md", proposal), /^\[applied\] Because the parser broke\./);

  const tasks = "# Tasks\r\n\r\n- [x] done one\r\n- [ ] do two\r\n- [ ] do three\r\n";
  const t = changeSummary(".doctrina/changes/0001-x/tasks.md", tasks);
  assert.match(t, /1\/3 tasks checked/);
  assert.match(t, /Next: do two/);

  const delta = "# Spec Delta\r\n\r\n**Operation:** MODIFIED\r\n**Target spec on apply:** `.doctrina/specs/cli/spec.md`\r\n";
  assert.match(changeSummary(".doctrina/changes/0001-x/specs/cli/delta.md", delta), /MODIFIED →/);

  // Never null: an item with no summary is refused by the ladder and would
  // sit in the pack at full size forever.
  assert.ok(changeSummary(".doctrina/changes/0001-x/design.md", "# Design\r\n"));
});
