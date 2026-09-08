// @ts-check
import path from "node:path";
import { exists, isDir, isFile, read, relPath, walk } from "./fs-ops.js";
import { c } from "./colors.js";
import { checklistProgress, isUntouchedScaffold } from "./doc-model.js";
import { collectBudgets } from "./runtime.js";

// The structural ANALYSIS of a change folder, as data.
//
// `lib/gates.js` enforces these findings on every lifecycle transition, so
// the library depended on a command module to compute them — a lib->command
// edge that made the dependency graph a cycle waiting to happen (audit
// finding F7). The findings are what the gate map is built on; they belong
// here, and `commands/analyze.js` is the renderer that prints them.

// The structural findings for a change, as data. Exported so the shared
// gate map (`lib/gates.js`) can enforce the SAME checks on every
// transition that needs them, instead of each command deciding for itself
// — `change apply` used to mutate a change that `analyze` had just
// refused (audit item C6).
export function collectAnalysis(projectRoot, changeDir) {
  const results = [];

  // proposal.md
  const proposalPath = path.join(changeDir, "proposal.md");
  if (!isFile(proposalPath)) {
    results.push(fail("proposal.md missing"));
  } else {
    results.push(pass("proposal.md present"));
    const text = read(proposalPath);
    if (/^##\s+Why\b/m.test(text)) results.push(pass(`proposal.md has a "## Why" section`));
    else results.push(fail(`proposal.md missing "## Why" section`));

    // A section that still holds only its scaffold comment was never
    // written. The check above only proved the HEADING survived, which is
    // why six changes closed in one session with every rationale section
    // empty: the planning step wrote to the file with a pattern that did
    // not match its line endings, and nothing downstream looked inside.
    // For a framework whose whole premise is recoverable provenance, an
    // archived change that cannot say why it happened is the defect.
    // Only `Why` and `What` are required. They are what makes a change
    // recoverable a year later — the reason it exists and the shape it
    // took. `Scope boundaries` and `Open questions` are legitimately empty
    // on a change that has neither, and demanding the word "None." there
    // is friction that buys nothing.
    const hollow = [];
    for (const m of text.matchAll(/^##\s+(.+?)[ \t]*\r?$/gm)) {
      const heading = m[1].trim();
      if (!/^(Why|What)$/i.test(heading)) continue;
      const start = m.index + m[0].length;
      const next = text.slice(start).search(/^##\s+/m);
      const body = (next < 0 ? text.slice(start) : text.slice(start, start + next));
      // Strip comments; anything left that is not whitespace is real prose.
      if (body.replace(/<!--[\s\S]*?-->/g, "").trim() === "") hollow.push(heading);
    }
    if (hollow.length > 0) {
      results.push(fail(
        `proposal.md has ${hollow.length} unwritten section${hollow.length === 1 ? "" : "s"} ` +
        `(${hollow.join(", ")}) — a heading that survived is not a section that was written`,
      ));
    } else {
      results.push(pass("proposal.md states why and what"));
    }
  }

  // tasks.md
  const tasksPath = path.join(changeDir, "tasks.md");
  if (!isFile(tasksPath)) {
    results.push(fail("tasks.md missing"));
  } else {
    results.push(pass("tasks.md present"));
    const text = read(tasksPath);
    // Scaffold placeholders never replaced ("- [ ]" with no text, checked or
    // not) mean the change was OPENED but never PLANNED — the agent went
    // straight to implementing on a hollow change and nothing barked
    // (operator report 2026-07-19). A hard failure here blocks `change
    // check` and `close` until the plan is real; ticking an empty box does
    // not help, `change tick` refuses those too.
    const placeholders = checklistProgress(text).placeholders;
    if (placeholders > 0) {
      results.push(fail(`tasks.md still carries ${placeholders} scaffold placeholder task${placeholders === 1 ? "" : "s"} ("- [ ]" with no text) — plan the change before implementing: replace them with real tasks (or delete the lines)`));
    }
    if (/^\s*-\s*\[\s\]/m.test(text)) results.push(pass("tasks.md has at least one unchecked task"));
    else results.push(info("tasks.md has no unchecked tasks (already done?)"));
  }

  // design.md (optional)
  const designPath = path.join(changeDir, "design.md");
  if (isFile(designPath)) results.push(info("design.md present"));
  else results.push(info("design.md absent (optional)"));

  // Spec deltas
  const deltaFiles = walk(path.join(changeDir, "specs")).filter((p) => p.endsWith("delta.md"));
  if (deltaFiles.length === 0) {
    results.push(info("0 spec deltas (metadata-only change)"));
  } else {
    results.push(pass(`${deltaFiles.length} spec delta${deltaFiles.length === 1 ? "" : "s"}:`));
    for (const deltaPath of deltaFiles) {
      const rel = relPath(projectRoot, deltaPath);
      const text = read(deltaPath);
      const opMatch = text.match(/^\*\*Operation:\*\*\s*([A-Z]+)/m);
      const op = opMatch ? opMatch[1] : null;
      const capMatch = text.match(/^#\s+Spec Delta\s*[—-]\s*capability:\s*([a-z][a-z0-9-]*)/m);
      const cap = capMatch ? capMatch[1] : path.basename(path.dirname(deltaPath));

      if (!op) {
        results.push(fail(`  ${rel}: Operation header missing or malformed`));
        continue;
      }
      if (!["ADDED", "MODIFIED", "REMOVED"].includes(op)) {
        results.push(fail(`  ${rel}: Operation "${op}" is not one of ADDED|MODIFIED|REMOVED`));
        continue;
      }
      const targetSpec = path.join(projectRoot, ".doctrina", "specs", cap, "spec.md");
      const targetRel = relPath(projectRoot, targetSpec);
      if (op === "ADDED") {
        // Mirrors `change apply`: an existing target that is still the
        // untouched `spec new` scaffold is the canonical flow (spec new →
        // ADDED delta), so it passes as a replacement; only real content fails.
        if (exists(targetSpec) && !isUntouchedScaffold(read(targetSpec), cap)) {
          results.push(fail(`  ${cap} (ADDED) but target ${targetRel} has real content — use MODIFIED or remove it first`, "pre-apply"));
        } else if (exists(targetSpec)) {
          results.push(pass(`  ${cap} (ADDED) → ${targetRel} (replaces the untouched scaffold)`));
        } else {
          results.push(pass(`  ${cap} (ADDED) → ${targetRel} (new)`));
        }
      } else if (op === "MODIFIED") {
        if (!exists(targetSpec)) {
          results.push(fail(`  ${cap} (MODIFIED) but target ${targetRel} does not exist`, "pre-apply"));
        } else {
          results.push(pass(`  ${cap} (MODIFIED) → ${targetRel}`));
        }
      } else {
        if (!exists(targetSpec)) {
          results.push(fail(`  ${cap} (REMOVED) but target ${targetRel} does not exist`, "pre-apply"));
        } else {
          results.push(pass(`  ${cap} (REMOVED) → ${targetRel}`));
        }
      }
    }
  }

  // BUDGET DISCIPLINE (change 0029). A declared ceiling is a contract, not
  // a preference — and the tempting fix for "the output blew the limit" is
  // to raise the limit. That buys headroom by truncating what mattered
  // instead of sending less, and it is the discussion that comes back every
  // quarter because nothing ever recorded that it had been settled. Raising
  // an INPUT ceiling is a normal trade-off; raising an OUTPUT ceiling to
  // resolve an overflow is the move this refuses.
  for (const r of checkBudgetRaises(projectRoot, changeDir)) results.push(r);

  return results;
}

// Compare the ceilings a change's proposal/deltas propose against the ones
// the contracts declare today. Text-scanned: a change states a new value in
// prose long before any code moves, which is exactly when it should be
// argued about.
function checkBudgetRaises(projectRoot, changeDir) {
  const results = [];
  let declared;
  try {
    declared = collectBudgets(projectRoot);
  } catch {
    return results;
  }
  if (declared.size === 0) return results;

  const texts = [];
  for (const f of walk(changeDir)) {
    if (f.endsWith(".md")) texts.push({ rel: relPath(projectRoot, f), text: read(f) });
  }

  for (const [name, budget] of declared) {
    if (budget.direction !== "output") continue;
    for (const { rel, text } of texts) {
      // "<limit> ... <number>" on one line: the shape a proposal uses when
      // it restates a ceiling ("raise ai-summary to 2000").
      const re = new RegExp(`${escapeRe(name)}[^\\n]{0,60}?(\\d{2,})`, "gi");
      for (const m of text.matchAll(re)) {
        const proposed = Number.parseInt(m[1], 10);
        if (!Number.isFinite(proposed) || proposed <= budget.value) continue;
        results.push(fail(
          `${rel} raises the OUTPUT ceiling "${name}" from ${budget.value} to ${proposed} ` +
          `(declared in ${budget.contract}) — raising an output budget buys headroom by ` +
          `truncating what mattered. Send less, or supersede the budget deliberately in the contract`,
        ));
        break;
      }
    }
  }
  return results;
}

// A limit name comes from a contract table cell, so it is user text and
// must not be spliced into a pattern unescaped.
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pass(msg) {
  return { kind: "pass", line: c.green("✓ ") + msg };
}
// `scope` says WHEN a failure is a real answer.
//
// Most of these questions are true at every point in a change's life: a
// proposal with an unwritten `## What` is hollow before an apply and just as
// hollow after one. A few are only meaningful BEFORE the apply — "an ADDED
// delta's target must not already hold real content" is proof of a problem
// beforehand and proof the apply WORKED afterwards.
//
// The gate map used to exclude the whole structure gate from `archive` to
// dodge that handful, which also dropped the hollow-proposal check — the
// exact defect this repository's own history records as having "shipped six
// hollow proposals past every gate". Tagging the pre-apply ones lets
// `archive` keep the rest.
function fail(msg, scope = "always") {
  return { kind: "fail", scope, line: c.red("✗ ") + msg };
}
function info(msg) {
  return { kind: "info", line: c.gray("- ") + msg };
}
