import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  fitToBudget, relevance, compareRank, queryTerms, DEFAULT_BUDGET,
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

  for (const cap of ["cli", "gates", "skills"]) {
    const out = run(repoRoot, ["context", cap]).stdout;
    for (const file of unscoped) {
      assert.match(out, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `unscoped ADR ${file} missing from the "${cap}" pack`);
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

  const other = ["cli", "core", "docs", "gates", "skills", "templates", "validation"]
    .find((cap) => cap !== scoped.scope[0]);
  const excluded = run(repoRoot, ["context", other]).stdout;
  assert.doesNotMatch(excluded, new RegExp(path.basename(scoped.path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `ADR ${scoped.id} is scoped to ${scoped.scope[0]} but still loaded into the "${other}" pack`);
});

// --------------------------------------------------------------- budget

test("the scoped pack for every capability fits the default budget", () => {
  // The audit's acceptance number: `context cli` below 15,000 tokens. It
  // was ~37,900.
  for (const cap of ["cli", "core", "docs", "gates", "skills", "templates", "validation"]) {
    const res = run(repoRoot, ["context", cap]);
    const total = tokensOf(res.stdout);
    assert.ok(total !== null, `no token total reported for "${cap}"`);
    assert.ok(total <= DEFAULT_BUDGET,
      `pack for "${cap}" is ~${total} tokens, over the ${DEFAULT_BUDGET} default`);
    assert.equal(res.status, 0, `context ${cap} exited ${res.status}`);
  }
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
    item("AGENTS.md", 0, 1000, []),
    item(".doctrina/specs/a/spec.md", 1, 2000, [0, 1, 5]),
    item(".doctrina/specs/b/spec.md", 1, 2000, [1, 2, 9]),
    item(".doctrina/decisions/0001-a.md", 3, 900, [0, 0, 0, 1], { adrId: "0001" }),
    item(".doctrina/decisions/0002-b.md", 3, 900, [0, 0, 0, 2], { adrId: "0002" }),
    item(".doctrina/decisions/0003-c.md", 3, 900, [1, 0, 0, 3], { adrId: "0003" }),
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
  const full = pack.filter((i) => !i.dropped && !i.degraded && i.tier !== 0);
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
  assert.deepEqual(queryTerms("add a new gate for the exit codes"), ["add", "new", "gate", "exit", "codes"]);
  assert.deepEqual(queryTerms(""), []);
  assert.deepEqual(queryTerms(undefined), []);
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
