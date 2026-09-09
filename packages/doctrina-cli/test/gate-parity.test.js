import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { TRANSITIONS } from "../src/lib/gates.js";

// C6. `analyze` exited 1 on a change and `change apply` mutated it anyway
// and exited 0 — through the analyze → apply path the README flowchart
// tells agents to follow. The two neighbouring gates (`archive`, `close`)
// both refused. So the same precondition was enforced or not depending on
// which command drove the transition.
//
// The table below enumerates every lifecycle transition and asserts each
// is guarded identically no matter which command reaches it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-gate-"));
  runCli(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"], tmp);
  return tmp;
}

// A change that is structurally BROKEN: a delta with no Operation header.
function brokenChange(tmp, id = "0001-broken") {
  runCli(["change", "new", id, "broken change"], tmp);
  planTasks(tmp, id);
  const dir = path.join(tmp, ".doctrina", "changes", id, "specs", "billing");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "delta.md"), "# Spec Delta — capability: billing\n\nno operation header\n");
  tickAll(tmp, id);
  return id;
}

// A change that is structurally fine but NOT verified (boxes unchecked).
function unverifiedChange(tmp, id = "0001-unverified") {
  runCli(["change", "new", id, "unverified change"], tmp);
  planTasks(tmp, id);
  return id;
}

function planTasks(tmp, id) {
  const p = path.join(tmp, ".doctrina", "changes", id, "tasks.md");
  if (existsSync(p)) {
    writeFileSync(p, readFileSync(p, "utf8").replace(/^(\s*-\s*\[[ xX]\])\s*$/gm, "$1 do the work"));
  }
}

function tickAll(tmp, id) {
  for (const f of ["tasks.md", "proposal.md"]) {
    const p = path.join(tmp, ".doctrina", "changes", id, f);
    if (existsSync(p)) writeFileSync(p, readFileSync(p, "utf8").replaceAll("- [ ]", "- [x]"));
  }
}

// Every transition, the gates it declares, and a fixture that violates each.
const TABLE = [
  {
    transition: "apply",
    argv: (id) => ["change", "apply", id],
    violations: [
      { gate: "structure", make: brokenChange },
    ],
  },
  {
    transition: "archive",
    argv: (id) => ["change", "archive", id],
    violations: [
      { gate: "verification", make: unverifiedChange },
    ],
  },
];

test("the gate map declares a guard for every lifecycle transition in the table", () => {
  for (const row of TABLE) {
    const declared = TRANSITIONS[row.transition];
    assert.ok(declared, `no gate declaration for transition "${row.transition}"`);
    for (const v of row.violations) {
      assert.ok(declared.gates.includes(v.gate),
        `transition "${row.transition}" does not declare the "${v.gate}" gate the table exercises`);
    }
  }
});

for (const row of TABLE) {
  for (const violation of row.violations) {
    test(`${row.transition} refuses a change violating the ${violation.gate} gate`, () => {
      const tmp = project();
      try {
        const id = violation.make(tmp);
        const before = snapshot(tmp);

        const r = runCli(row.argv(id), tmp);
        assert.notEqual(r.status, 0,
          `${row.transition} accepted a change violating ${violation.gate}:\n${r.stdout}`);
        assert.match(r.stdout + r.stderr, new RegExp(`\\[${violation.gate}\\]`),
          "the refusal must name the gate that blocked it");
        assert.deepEqual(snapshot(tmp), before,
          `${row.transition} mutated the tree while refusing`);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    test(`${row.transition} --force proceeds past ${violation.gate} and records the gap`, () => {
      const tmp = project();
      try {
        const id = violation.make(tmp);
        const r = runCli([...row.argv(id), "--force"], tmp);

        // --force waives the PRECONDITION, not the operation. Forcing past
        // a structure blocker still lets `apply` fail on the same
        // malformed delta when it tries to read it — which is right: the
        // gate is a promise about what is checked before starting, not a
        // promise that the work will succeed.
        assert.match(r.stdout, /--force/, "a forced transition must say so");
        assert.match(r.stdout, new RegExp(`\\[${violation.gate}\\]`),
          "the waived blocker must still be named");

        // And the ledger records the gap only if the transition ACTUALLY
        // happened (change 0096). This case used to assert the line
        // unconditionally, which is how `apply --force` came to log
        // "forced apply past 3 blockers" for an apply that wrote nothing
        // and left the proposal `proposed`. The ledger is the readable
        // source of what happened to the tree, so the claim follows the
        // outcome rather than the override.
        const ledger = path.join(tmp, ".doctrina", "changes", "archive", "LEDGER.md");
        const recorded = existsSync(ledger)
          && new RegExp(`forced ${row.transition} past`).test(readFileSync(ledger, "utf8"));
        assert.equal(recorded, r.status === 0,
          r.status === 0
            ? "a forced transition that succeeded must record the gap"
            : "a forced transition that failed must claim nothing");
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  }
}

test("close refuses the same change apply refuses, at the same gate", () => {
  // The parity claim in its sharpest form: one broken change, two drivers,
  // identical verdict.
  const viaApply = project();
  const viaClose = project();
  try {
    const a = brokenChange(viaApply);
    const b = brokenChange(viaClose);
    const applyRun = runCli(["change", "apply", a], viaApply);
    const closeRun = runCli(["close", b], viaClose);
    assert.notEqual(applyRun.status, 0, "apply must refuse");
    assert.notEqual(closeRun.status, 0, "close must refuse");
    assert.ok(existsSync(path.join(viaApply, ".doctrina", "changes", a)));
    assert.ok(existsSync(path.join(viaClose, ".doctrina", "changes", b)));
  } finally {
    rmSync(viaApply, { recursive: true, force: true });
    rmSync(viaClose, { recursive: true, force: true });
  }
});

// A cheap content fingerprint of the artifact tree, to prove a refusing
// command wrote nothing.
function snapshot(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.push(`${path.relative(root, p)}:${readFileSync(p, "utf8").length}`);
    }
  };
  walk(path.join(root, ".doctrina"));
  return out;
}

// ------------------------------------- archive keeps the integrity gate (0.15.1)
//
// `archive` deliberately excludes `structure`, because one of its checks
// ("an ADDED delta's target must not already hold real content") is proof
// of a problem BEFORE an apply and proof the apply WORKED after one. But
// excluding the whole gate also dropped the hollow-proposal check, which
// has no such problem — so a change `apply` had just refused for an
// unwritten `## What` could be archived anyway, and stamped "applied".
// Observed on change 0030 of this repository.

// A change whose proposal still holds its scaffold comment under `## What`,
// with everything else in order.
function hollowProposalChange(tmp, id = "0001-hollow") {
  runCli(["change", "new", id, "hollow change"], tmp);
  planTasks(tmp, id);
  tickAll(tmp, id);
  return id;
}

test("archive refuses a hollow proposal, exactly as apply does", () => {
  const tmp = project();
  try {
    const id = hollowProposalChange(tmp);

    const applied = runCli(["change", "apply", id], tmp);
    assert.notEqual(applied.status, 0, "apply must refuse a hollow proposal");
    assert.match(applied.stderr, /unwritten section/);

    const archived = runCli(["change", "archive", id], tmp);
    assert.notEqual(archived.status, 0, "archive must refuse what apply refused");
    assert.match(archived.stderr, /\[integrity\]/);
    assert.match(archived.stderr, /unwritten section/);

    // And nothing was moved or stamped on the way out.
    assert.ok(
      existsSync(path.join(tmp, ".doctrina", "changes", id, "proposal.md")),
      "a refused archive must leave the change where it was",
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("the post-apply false positive stays excluded: a real change still archives", () => {
  const tmp = project();
  try {
    // The whole reason `structure` was excluded from archive: after a
    // successful apply, the ADDED delta's target holds exactly what the
    // delta wrote, and re-asking reports that as a conflict.
    const id = "0001-real";
    runCli(["change", "new", id, "a real change"], tmp);
    planTasks(tmp, id);
    // `change new` scaffolds the rationale sections empty (only `work`
    // seeds `## Why` from a prompt), so both must be written or the
    // integrity gate correctly refuses before we reach the case under test.
    const proposal = path.join(tmp, ".doctrina", "changes", id, "proposal.md");
    writeFileSync(
      proposal,
      readFileSync(proposal, "utf8")
        .replace(/## Why\r?\n\r?\n<!--[\s\S]*?-->/, "## Why\n\nBilling needs a spec.")
        .replace(/## What\r?\n\r?\n<!--[\s\S]*?-->/, "## What\n\nAdds the billing spec."),
    );
    const dir = path.join(tmp, ".doctrina", "changes", id, "specs", "billing");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "delta.md"), [
      "# Spec Delta — capability: billing",
      "",
      "**Operation:** ADDED",
      "**Target spec on apply:** `.doctrina/specs/billing/spec.md`",
      "",
      "---",
      "",
      "# Spec — billing",
      "",
      "**Capability:** billing",
      "**Status:** active",
      "**Implementation:** implemented",
      "**Version:** 0.1.0",
      "",
      "## Purpose",
      "",
      "Bill people.",
      "",
      "## Acceptance criteria",
      "",
      "1. [verified] It bills — verified by `AGENTS.md`.",
      "",
    ].join("\n"));
    tickAll(tmp, id);

    const applied = runCli(["change", "apply", id], tmp);
    assert.equal(applied.status, 0, `apply must succeed: ${applied.stderr}${applied.stdout}`);
    const archived = runCli(["change", "archive", id], tmp);
    assert.equal(archived.status, 0, `archive must not re-ask a pre-apply question: ${archived.stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("every gate a transition names exists in the gate map", () => {
  for (const [name, t] of Object.entries(TRANSITIONS)) {
    assert.ok(Array.isArray(t.gates) && t.gates.length > 0, `${name} declares no gates`);
  }
  // archive must keep BOTH: the structural questions that survive an apply,
  // and the verification ones.
  assert.deepEqual(TRANSITIONS.archive.gates, ["integrity", "verification"]);
});
