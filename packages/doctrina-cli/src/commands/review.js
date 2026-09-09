// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { rankCapabilitiesByDiff } from "../lib/work-model.js";
import { readLedger, churnByCapability } from "../lib/ledger.js";
import { changedFiles, windowCutoff, historyState, refExists } from "../lib/git.js";
import { dependentsOf } from "../lib/scan.js";
import { notADoctrinaProject, EXIT } from "../lib/exit-codes.js";
import { summarize as coverageSummary } from "../lib/coverage-model.js";
import { summarize as traceSummary } from "../lib/trace-model.js";

// Deterministic conformance review (review 2026-06-27 passive-user feature #3).
// Given the working tree (or a diff against a ref), report STRUCTURAL breaks
// between the change and the spec/ADR/contract tree, so the agent self-reviews
// before bringing work to the human and the human's approval is one command.
//
// It checks links and conformance shape, NOT semantic fidelity — whether the
// code actually does what the spec says stays a human/LLM call, the same honest
// ceiling as `trace`/`clarify` (ADR 0005). Read-only; exits 0 as a report, 1
// under --strict when any break exists (CI gate).

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// How far back the churn note looks, and how many landed changes make it
// worth saying at all. A window rather than "all time": a capability that
// moved nine times two years ago is history, not news.
const CHURN_WINDOW_DAYS = 60;
const CHURN_NOTABLE = 3;

// How many unclaimed files the orphan note names before it summarises the
// rest. Long enough to act on, short enough that a wide refactor does not
// bury every other finding under a file listing.
const ORPHAN_LIST_LIMIT = 5;

export const flags = { boolean: ["json", "strict"], string: ["diff"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  const strict = flagBool(flags, "strict", false);
  const against = flagString(flags, "diff"); // optional git ref to diff against

  // A ref the git cannot resolve is a filter that matches nothing, and the
  // review used to read it as "nothing changed" — exit 0, `--strict`
  // included, on a tree where a valid ref reported breaks. A CI job running
  // `doctrina review --diff main --strict` stayed green forever on a shallow
  // clone with no local `main` (change 0092). Only asked inside a usable
  // repository: outside one the command still stays silent rather than
  // accusing.
  if (against && historyState(projectRoot).usable && !refExists(projectRoot, against)) {
    console.error(c.red("error:") + ` --diff names a ref this repository cannot resolve: "${against}"`);
    console.error(c.gray("hint: ") + "check the branch or commit name — a ref that resolves to nothing is not an empty diff");
    return EXIT.USAGE;
  }

  const { all, sourceFiles } = reviewScope(projectRoot, against);
  console.log(c.bold("Review") + c.gray(against ? ` — vs ${against}` : " — working-tree changes"));
  console.log("");

  if (all.length === 0) {
    console.log(c.gray(against
      ? `no changes between ${against} and the working tree`
      : "no working-tree changes to review (stage or edit code first, or pass --diff <ref>)"));
    return 0;
  }

  const breaks = []; // hard conformance breaks (fail --strict)
  const notes = [];  // advisory observations

  // 1. Code changed under a capability whose spec was NOT touched — the spec
  //    may have drifted from the code it describes. Touched = every capability
  //    matched by the code diff (UNCAPPED — the top-3 hint truncation is how
  //    this missed 5 of 8 in the 0.11.0 field session) UNIONED with every
  //    capability whose spec.md itself changed.
  const specChanged = new Set(
    all.filter((f) => /(^|\/)\.doctrina\/specs\/[^/]+\/spec\.md$/.test(f.replace(/\\/g, "/")))
      .map((f) => f.replace(/\\/g, "/").match(/\.doctrina\/specs\/([^/]+)\/spec\.md$/)[1]),
  );
  const ranked = rankCapabilitiesByDiff(projectRoot, sourceFiles, { limit: Infinity });
  const touched = new Set([...specChanged, ...ranked.map((m) => m.id)]);
  for (const m of ranked) {
    if (!specChanged.has(m.id)) {
      breaks.push(`code under capability "${m.id}" changed, but its spec was not updated — confirm \`.doctrina/specs/${m.id}/spec.md\` still describes the code (update it, or note why not)`);
    }
  }

  // 1b. Dependents of touched capabilities (the machine-readable
  //     **Depends on:** header): a spec that builds on something you changed
  //     may silently no longer hold. Advisory — a pointer, not a verdict.
  for (const dep of dependentsOf(projectRoot, touched)) {
    notes.push(`capability "${dep.capability}" depends on touched ${dep.dependsOn.map((d) => `"${d}"`).join(", ")} — confirm it still holds (\`doctrina why ${dep.capability}\`)`);
  }

  // 1c. How often each touched capability has moved lately, from the archive
  //     ledger (change 0046). Reported as a NUMBER and never as a verdict:
  //     frequent change can mean a spec that was drawn badly or a spec that
  //     is simply where the work is, and nothing here can tell those apart
  //     (ADR 0005). It is context for the human reading the review, not a
  //     finding — so it goes in the notes even when the count is high.
  if (touched.size > 0) {
    const since = windowCutoff(CHURN_WINDOW_DAYS);
    const churn = churnByCapability(readLedger(projectRoot).entries, { since })
      .filter((row) => touched.has(row.capability) && row.changes >= CHURN_NOTABLE);
    for (const row of churn) {
      notes.push(`capability "${row.capability}" landed ${row.changes} changes in the last ${CHURN_WINDOW_DAYS} days (last ${row.last}) — history, not a verdict: read it as "this area is moving", not "this area is wrong"`);
    }
  }

  // 2. Changed source files that map to no capability at all — code with no
  //    home in any spec. Reported PER FILE (change 0077): the old form fired
  //    only when the WHOLE diff matched nothing, so one incidental match —
  //    any file under `docs/`, which matches the `docs` capability because
  //    the directory is named after it — silenced the finding for every other
  //    file in the change. A review of an adapter change reported
  //    "Capabilities touched: docs" and said nothing about the adapter.
  const orphans = sourceFiles.filter(
    (f) => rankCapabilitiesByDiff(projectRoot, [f], { limit: 1 }).length === 0,
  );
  if (orphans.length > 0) {
    const shown = orphans.slice(0, ORPHAN_LIST_LIMIT).map((f) => `\`${f}\``).join(", ");
    const more = orphans.length > ORPHAN_LIST_LIMIT ? `, and ${orphans.length - ORPHAN_LIST_LIMIT} more` : "";
    notes.push(`${orphans.length} changed file(s) belong to no capability: ${shown}${more} — claim them with a \`**Source:**\` header on the owning spec, or scaffold the capability they are (\`doctrina spec new <capability>\`)`);
  }

  // 3. Coverage — acceptance criteria whose cited proof is missing/skipped.
  const cov = coverageSummary(projectRoot);
  if (cov.totalDangling > 0) {
    breaks.push(`${cov.totalDangling} acceptance criterion(s) cite evidence missing on disk (\`doctrina coverage\`)`);
  }
  if (cov.totalConditional > 0) {
    notes.push(`${cov.totalConditional} acceptance criterion(s) proven only by a skipped test (\`doctrina coverage\`)`);
  }
  if (cov.totalCriteria > 0 && cov.totalCovered < cov.totalCriteria - cov.totalDangling - cov.totalConditional) {
    notes.push(`coverage is ${cov.pct}% (${cov.totalCovered}/${cov.totalCriteria}) — uncovered criteria carry no proof`);
  }

  // 4. Trace — product intent that no spec realizes, or specs realizing nothing.
  const tr = traceSummary(projectRoot);
  if (tr.dropped > 0) breaks.push(`${tr.dropped} product intent anchor(s) are realized by no spec (\`doctrina trace\`)`);
  if (tr.untraceable > 0) notes.push(`${tr.untraceable} active spec(s) trace to no product intent (\`doctrina trace\`)`);

  // 5. Contract surface — port collisions / env drift / dangling spec refs.
  const contractIssues = runContractCheck(projectRoot);
  for (const issue of contractIssues) breaks.push(issue);

  // --- Output ---
  console.log(c.gray(`${all.length} changed path(s); ${sourceFiles.length} source file(s) outside .doctrina/.`));
  if (touched.size > 0) {
    console.log(c.gray("Capabilities touched: ") + [...touched].sort().map((id) => c.cyan(id)).join(", "));
  }
  console.log("");

  if (breaks.length === 0 && notes.length === 0) {
    console.log(c.green("ok") + " no structural conformance breaks found");
  } else {
    for (const b of breaks) console.log(`  ${c.red("✗")} ${b}`);
    for (const n of notes) console.log(`  ${c.yellow("!")} ${n}`);
    console.log("");
    const summary = `${breaks.length} break${breaks.length === 1 ? "" : "s"}, ${notes.length} note${notes.length === 1 ? "" : "s"}`;
    const status = breaks.length === 0 ? c.green("ok") : (strict ? c.red("fail") : c.yellow("gap"));
    console.log(status + " " + summary);
  }

  console.log("");
  console.log(c.gray("Structural review only — whether the code is FAITHFUL to the spec is a human/LLM call."));
  return strict && breaks.length > 0 ? 1 : 0;
}

// Changed paths between a base (a git ref, or HEAD + untracked for the working
// tree) and now, split into the full list and the subset outside .doctrina/.
// The git question itself goes through the one door (lib/git.js).
function reviewScope(projectRoot, against) {
  // Against a named ref, untracked files are noise: the question is what this
  // branch changed, not what is lying around uncommitted.
  const all = changedFiles(projectRoot, { since: against, untracked: !against }).files;
  const sourceFiles = all.filter((f) => !f.replace(/\\/g, "/").startsWith(".doctrina/"));
  return { all, sourceFiles };
}

// Light re-detection of the two contract breaks that matter to a review — a
// port claimed by two contracts, and a referenced spec that does not exist. The
// full contract gate stays `doctrina contract check`; this keeps review
// self-contained without spawning it.
function runContractCheck(projectRoot) {
  const issues = [];
  const contractsDir = path.join(projectRoot, ".doctrina", "contracts");
  if (!isDir(contractsDir)) return issues;
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const ports = new Map(); // port -> contract id
  for (const f of readdirSync(contractsDir)) {
    if (!f.endsWith(".md")) continue;
    const id = path.basename(f, ".md");
    const text = read(path.join(contractsDir, f));
    for (const m of text.matchAll(/`?(\d{2,5})`?\s*\|/g)) {
      const port = m[1];
      if (Number(port) >= 1 && Number(port) <= 65535) {
        if (ports.has(port) && ports.get(port) !== id) {
          issues.push(`contract port ${port} is claimed by both "${ports.get(port)}" and "${id}" (\`doctrina contract check\`)`);
        } else {
          ports.set(port, id);
        }
      }
    }
    for (const m of text.matchAll(/\.doctrina\/specs\/([a-z0-9-]+)\//g)) {
      const cap = m[1];
      if (!isFile(path.join(specsDir, cap, "spec.md"))) {
        issues.push(`contract "${id}" references spec "${cap}" which does not exist (\`doctrina contract check\`)`);
      }
    }
  }
  return issues;
}

export const help = `
Usage: doctrina review [--diff <ref>] [--strict]

Deterministic conformance review of your changes against the spec / ADR /
contract tree. By default it reviews the working-tree changes (tracked +
untracked); with --diff <ref> it reviews everything that differs from a git
ref (e.g. \`doctrina review --diff main\`).

Reports structural breaks: code changed under a capability whose spec was
not updated, changed code that maps to no capability, acceptance criteria
citing missing proof, product intent realized by no spec, and contract
port/reference collisions. It checks conformance shape, NOT semantic
fidelity (whether the code does what the spec says stays a human/LLM call).

Read-only. Exits 0 as a report; with --strict, exits 1 when any hard break
exists (CI gate). Notes (advisory) never fail the gate.
`;
