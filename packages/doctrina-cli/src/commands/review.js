import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { rankCapabilitiesByDiff } from "./work.js";
import { summarize as coverageSummary } from "./coverage.js";
import { summarize as traceSummary } from "./trace.js";

// Deterministic conformance review (review 2026-06-27 passive-user feature #3).
// Given the working tree (or a diff against a ref), report STRUCTURAL breaks
// between the change and the spec/ADR/contract tree, so the agent self-reviews
// before bringing work to the human and the human's approval is one command.
//
// It checks links and conformance shape, NOT semantic fidelity — whether the
// code actually does what the spec says stays a human/LLM call, the same honest
// ceiling as `trace`/`clarify` (ADR 0005). Read-only; exits 0 as a report, 1
// under --strict when any break exists (CI gate).

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
  const strict = flagBool(flags, "strict", false);
  const against = flagString(flags, "diff"); // optional git ref to diff against

  const { all, sourceFiles } = changedFiles(projectRoot, against);
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
  //    may have drifted from the code it describes.
  const specChanged = new Set(
    all.filter((f) => /(^|\/)\.doctrina\/specs\/[^/]+\/spec\.md$/.test(f.replace(/\\/g, "/")))
      .map((f) => f.replace(/\\/g, "/").match(/\.doctrina\/specs\/([^/]+)\/spec\.md$/)[1]),
  );
  const ranked = rankCapabilitiesByDiff(projectRoot, sourceFiles);
  for (const m of ranked) {
    if (!specChanged.has(m.id)) {
      breaks.push(`code under capability "${m.id}" changed, but its spec was not updated — confirm \`.doctrina/specs/${m.id}/spec.md\` still describes the code (update it, or note why not)`);
    }
  }

  // 2. New source files that map to no capability at all — code with no home
  //    in any spec (a likely new, unspecced capability).
  if (ranked.length === 0 && sourceFiles.length > 0) {
    notes.push(`changed code maps to no existing capability spec — if this is a new capability, scaffold it: \`doctrina spec new <capability>\` (or \`doctrina work --from-diff\`)`);
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
  if (ranked.length > 0) {
    console.log(c.gray("Capabilities touched: ") + ranked.map((m) => c.cyan(m.id)).join(", "));
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
// tree) and now. Returns the full list and the subset outside .doctrina/.
function changedFiles(projectRoot, against) {
  const run = (args) => {
    const r = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
    if (r.error || r.status !== 0) return [];
    return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  };
  const set = new Set();
  if (against) {
    for (const f of run(["diff", "--name-only", against])) set.add(f);
  } else {
    for (const f of run(["diff", "--name-only", "HEAD"])) set.add(f);
    for (const f of run(["ls-files", "--others", "--exclude-standard"])) set.add(f);
  }
  const all = [...set];
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
