// @ts-check
import { getSection, getHeader } from "../lib/doc-model.js";
import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, lineCount, mkdirp, move, read, relPath, remove, walk, write } from "../lib/fs-ops.js";
import { diffLines, formatUnified } from "../lib/diff.js";
import { locateTemplatesDir, loadTemplateTree, materialiseEntry } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex } from "../lib/scan.js";
import { extractOps, applyOps } from "../lib/spec-ops.js";
import { printAdrCheckpoint } from "../lib/adr-guard.js";
import { GATES, TRANSITIONS, checkTransition, recordForcedGap } from "../lib/gates.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { confirm, isInteractive } from "../lib/prompt.js";
import { EXIT } from "../lib/exit-codes.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { parseOperation, parseCapabilityFromDelta, isUntouchedScaffold } from "../lib/change-model.js";
import { changeNew } from "../lib/change-ops.js";

const SUBCOMMANDS = ["new", "apply", "archive", "check", "tick", "diff", "abandon"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "all", "chore", "design", "force", "no-spec"], string: ["reason"] };

export async function run(positional, flags) {
  const sub = positional[0];
  switch (sub) {
    case "new":
      return changeNew(positional.slice(1), flags);
    case "apply":
      return forEachId(positional.slice(1), "apply", (id) => changeApply([id], flags));
    case "archive":
      return forEachId(positional.slice(1), "archive", (id) => changeArchive([id], flags));
    case "check":
      return forEachId(positional.slice(1), "check", (id) => changeCheck(id));
    case "tick":
      return changeTick(positional.slice(1), flags);
    case "diff":
      return changeDiff(positional.slice(1), flags);
    case "abandon":
      return await changeAbandon(positional.slice(1), flags);
    default:
      console.error(c.red("error:") + ` unknown change subcommand "${sub ?? ""}"`);
      const guess = suggest(sub, SUBCOMMANDS);
      console.error(c.gray("hint: ") + (guess
        ? `did you mean \`doctrina change ${guess}\`?`
        : `available: ${SUBCOMMANDS.join(", ")}`));
      return 2;
  }
}

// Enforce a lifecycle transition's preconditions from the shared gate map.
// Returns true when the transition may proceed. One implementation, so
// every driver of a transition refuses — and explains, and forces —
// identically (C6).
function enforceTransition(projectRoot, id, changeDir, transition, flags) {
  const force = flagBool(flags, "force", false);
  const { ok, blockers } = checkTransition(projectRoot, changeDir, transition);
  if (ok) return true;

  const label = TRANSITIONS[transition].label;
  if (!force) {
    console.error(c.red("error:") + ` refusing to ${transition} "${id}" — ${blockers.length} blocker${blockers.length === 1 ? "" : "s"}:`);
    for (const b of blockers) console.error(`  - [${b.gate}] ${b.message}`);
    const reruns = [...new Set(blockers.map((b) => GATES[b.gate].rerun(id)))];
    console.error(c.gray("hint: ") + `fix them (${reruns.join(" · ")}), or pass --force to ${transition} anyway (records the gap)`);
    return false;
  }
  console.log(c.yellow("warn:") + ` ${label} "${id}" with ${blockers.length} blocker${blockers.length === 1 ? "" : "s"} (--force):`);
  for (const b of blockers) console.log(c.yellow("  - ") + `[${b.gate}] ${b.message}`);
  recordForcedGap(projectRoot, id, transition, blockers);
  return true;
}

// Batch driver (operator review 2026-07-19 §3.5/§4.5): apply/archive/check
// accept multiple ids so a backlog closes without a bash loop. Each id runs
// independently — one failure does not stop the rest — and the exit code is
// the worst one seen. `new` and `abandon` stay single-id on purpose (creation
// wants a title; abandonment is destructive and deserves one deliberate call).
async function forEachId(ids, name, one) {
  if (ids.length === 0) {
    console.error(c.red("error:") + ` change ${name} requires at least one <id>`);
    return 2;
  }
  let worst = 0;
  for (const id of ids) {
    if (ids.length > 1) {
      console.log("");
      console.log(c.bold(`──── change ${name} ${id}`));
    }
    let code;
    try {
      code = await one(id);
    } catch (err) {
      console.error(c.red("error:") + ` ${err.message}`);
      code = 1;
    }
    worst = Math.max(worst, code);
  }
  if (ids.length > 1) {
    console.log("");
    console.log(worst === 0
      ? c.green("ok") + ` all ${ids.length} changes passed ${name}`
      : c.red("fail") + ` at least one change failed ${name}`);
  }
  return worst;
}


function changeApply(args, flags) {
  const id = args[0];
  if (!id) {
    console.error(c.red("error:") + " change apply requires <id>");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  // Gate parity (C6). `apply` used to mutate specs with no preconditions,
  // so `analyze` could exit 1 on a change and `apply` would write it anyway
  // and exit 0 — through the very analyze → apply path the docs prescribe.
  // The preconditions now come from the shared map, so what guards a
  // transition does not depend on which command drove it.
  if (!enforceTransition(projectRoot, id, changeDir, "apply", flags)) return 1;

  // Applying twice is silent corruption. The ops verbs are ADDITIVE —
  // `append-requirement` appends, `bump-version` bumps — so a second pass
  // duplicates every requirement and criterion the delta carries and bumps
  // the version again. `apply` stamps the proposal `applied` on success, so
  // that stamp is the guard. (Found by `close` re-running apply on an
  // already-applied change and doubling 15 requirements on this repo.)
  const proposalPath = path.join(changeDir, "proposal.md");
  const alreadyApplied = isFile(proposalPath)
    && (getHeader(read(proposalPath), "Status") ?? "").trim().toLowerCase() === "applied";
  if (alreadyApplied && !flagBool(flags, "force", false)) {
    console.log(c.gray("skip ") + `change "${id}" is already applied — nothing to do`);
    console.log(c.gray("The ops verbs are additive: applying twice duplicates every"));
    console.log(c.gray("requirement this delta carries. Re-apply anyway with --force"));
    console.log(c.gray("only after reverting the specs to their pre-apply state."));
    return 0;
  }

  const deltaFiles = walk(path.join(changeDir, "specs")).filter((p) => p.endsWith("delta.md"));
  const date = today();
  let errors = 0;
  let writes = 0;
  let manual = 0;

  if (deltaFiles.length === 0) {
    console.log(c.yellow("note:") + " no spec deltas in this change. Marking proposal as applied.");
  }

  for (const deltaPath of deltaFiles) {
    const rel = relPath(changeDir, deltaPath);
    const text = read(deltaPath);
    const op = parseOperation(text);
    const capability = parseCapabilityFromDelta(text, deltaPath);
    if (!op || !capability) {
      console.error(c.red("error:") + ` cannot parse Operation or capability in ${rel}`);
      errors += 1;
      continue;
    }
    const targetPath = path.join(projectRoot, ".doctrina", "specs", capability, "spec.md");

    if (op === "ADDED") {
      // The canonical new-capability flow is `spec new <cap>` (which creates
      // the file) → write the ADDED delta — so "target already exists" is the
      // NORMAL case, not a conflict. When the existing spec is still the
      // untouched `spec new` scaffold, ADDED means "replace the placeholder
      // with the real spec" and applies as a whole-file write. Only a spec
      // with real content refuses, since overwriting it would destroy truth.
      if (exists(targetPath) && !isUntouchedScaffold(read(targetPath), capability)) {
        console.error(c.red("error:") + ` ADDED delta targets existing spec ${relPath(projectRoot, targetPath)} with real content — refusing to overwrite`);
        console.error(c.gray("hint: ") + "use a MODIFIED delta (with an ```ops block for bookkeeping edits), or REMOVE the spec first if it is truly being replaced");
        errors += 1;
        continue;
      }
      const replacing = exists(targetPath);
      const body = extractDeltaBody(text);
      write(targetPath, body, { force: replacing });
      writes += 1;
      console.log(c.green("applied[ADDED]") + ` ${relPath(projectRoot, targetPath)}` +
        (replacing ? c.gray(" (replaced the untouched spec-new scaffold)") : ""));
    } else if (op === "REMOVED") {
      if (!exists(targetPath)) {
        console.log(c.yellow("warn:") + ` REMOVED delta targets missing spec ${relPath(projectRoot, targetPath)} — skipping`);
        continue;
      }
      remove(targetPath);
      writes += 1;
      console.log(c.green("applied[REMOVED]") + ` ${relPath(projectRoot, targetPath)}`);
    } else if (op === "MODIFIED") {
      // A MODIFIED delta is applied mechanically when it carries a structured
      // `ops` block (set-header / bump-version / set-criterion / ...; F3);
      // otherwise it falls back to the historical manual-merge pointer, so
      // prose deltas keep working unchanged.
      const ops = extractOps(text);
      if (ops.length === 0) {
        console.log(c.yellow("manual[MODIFIED]") + ` merge ${relPath(projectRoot, deltaPath)} into ${relPath(projectRoot, targetPath)} by hand (no ops block)`);
        manual += 1;
      } else if (!exists(targetPath)) {
        console.error(c.red("error:") + ` MODIFIED delta targets missing spec ${relPath(projectRoot, targetPath)}`);
        errors += 1;
      } else {
        const result = applyOps(read(targetPath), ops);
        if (result.errors.length > 0) {
          console.error(c.red("error:") + ` ${result.errors.length} operation error${result.errors.length === 1 ? "" : "s"} in ${rel} — spec left untouched:`);
          for (const e of result.errors) console.error(`  - ${e}`);
          errors += 1;
        } else {
          write(targetPath, result.text, { force: true });
          writes += 1;
          console.log(c.green("applied[MODIFIED]") + ` ${relPath(projectRoot, targetPath)} (${result.applied.length} op${result.applied.length === 1 ? "" : "s"})`);
          for (const s of result.applied) console.log(c.gray(`    · ${s}`));
        }
      }
    } else {
      console.error(c.red("error:") + ` unknown Operation "${op}" in ${rel}`);
      errors += 1;
    }
  }

  // Flip proposal status from "proposed" to "applied" when fully successful.
  // Zero-delta changes are trivially successful (no work to fail), so they
  // also flip — otherwise metadata-only changes are stuck at "proposed".
  let flippedToApplied = false;
  if (errors === 0 && manual === 0) {
    const proposalPath = path.join(changeDir, "proposal.md");
    if (exists(proposalPath)) {
      const txt = read(proposalPath);
      const updated = txt.replace(
        /^(-\s+\*\*Status:\*\*)\s+proposed\s*$/m,
        `$1 applied\n- **Applied:** ${date}`,
      );
      if (updated !== txt) {
        write(proposalPath, updated, { force: true });
        console.log(c.green("status") + " proposal.md → applied");
        flippedToApplied = true;
      }
    }
  }

  // Update the index whenever specs changed (ADDED / REMOVED / MODIFIED-ops)
  // or the proposal flipped to applied. The files are the source of truth, so
  // rather than patch entry by entry — the old path that let a spec's
  // version/implementation text drift from the index, and forced a manual
  // lockstep bump (F3 / G5 / G7 / G8) — the index is rebuilt from the
  // now-updated tree in one shot. This keeps `index rebuild --check` green
  // immediately after apply.
  if (writes > 0 || flippedToApplied) {
    const current = idx.load(projectRoot);
    const derived = deriveIndex(projectRoot, current);
    derived.last_updated = date;
    idx.save(projectRoot, derived);
  }

  console.log("");
  console.log(c.bold("Apply summary:") + ` ${writes} written, ${manual} manual, ${errors} errors.`);
  if (manual > 0) {
    console.log(`Resolve manual merges, then run ${c.cyan(`doctrina change archive ${id}`)}.`);
  } else if (errors === 0) {
    console.log(`Next: ${c.cyan(`doctrina change archive ${id}`)}.`);
  }
  return errors > 0 ? 1 : 0;
}

// Pre-close dry-run (operator review 2026-07-19 §4.4): everything analyze,
// apply, and archive would refuse, listed BEFORE any of them runs, with the
// remediation next to each finding. Read-only — the per-change `doctor`.
async function changeCheck(id) {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  let failures = 0;

  // 1. Structural analysis — same checks analyze runs before an apply.
  console.log(c.gray("──── 1/3 structure (analyze)"));
  const analyze = await import("./analyze.js");
  if ((await analyze.run([id], new Map())) !== 0) failures += 1;

  // 2. Ops dry-run: execute every MODIFIED delta's ops block against the
  //    target spec in memory. An op that would fail at apply time (missing
  //    header, no such criterion, unknown verb) is reported here, not days
  //    later; a delta with no ops block is flagged as a manual merge so the
  //    close is planned around it instead of surprised by it.
  console.log(c.gray("──── 2/3 ops dry-run (what apply would do)"));
  const deltaFiles = walk(path.join(changeDir, "specs")).filter((p) => p.endsWith("delta.md"));
  let opsFindings = 0;
  for (const deltaPath of deltaFiles) {
    const text = read(deltaPath);
    if (parseOperation(text) !== "MODIFIED") continue;
    const capability = parseCapabilityFromDelta(text, deltaPath);
    const rel = relPath(projectRoot, deltaPath);
    const ops = extractOps(text);
    if (ops.length === 0) {
      console.log(c.yellow("⚠ ") + `${rel}: no ops block — apply will print a manual-merge pointer`);
      continue;
    }
    const targetPath = path.join(projectRoot, ".doctrina", "specs", capability ?? "", "spec.md");
    if (!capability || !exists(targetPath)) {
      console.log(c.red("✗ ") + `${rel}: MODIFIED targets missing spec`);
      opsFindings += 1;
      continue;
    }
    const result = applyOps(read(targetPath), ops);
    if (result.errors.length > 0) {
      console.log(c.red("✗ ") + `${rel}: ${result.errors.length} op error${result.errors.length === 1 ? "" : "s"} (apply would refuse):`);
      for (const e of result.errors) console.log(`    - ${e}`);
      opsFindings += 1;
    } else {
      console.log(c.green("✓ ") + `${rel}: ${result.applied.length} op${result.applied.length === 1 ? "" : "s"} would apply cleanly`);
    }
  }
  if (deltaFiles.length === 0) console.log(c.gray("- no spec deltas"));
  if (opsFindings > 0) failures += 1;

  // 3. Archive gate preview: what archive will refuse, listed with the fix.
  console.log(c.gray("──── 3/3 archive gate"));
  // Preview through the SAME map the transitions enforce, so `check` can
  // never disagree with what `apply` / `archive` will actually do (C6).
  const archiveGate = checkTransition(projectRoot, changeDir, "archive");
  if (archiveGate.ok) {
    console.log(c.green("✓ ") + `archive gate clear (${archiveGate.gates.join(" + ")})`);
  } else {
    failures += 1;
    for (const b of archiveGate.blockers) console.log(c.red("✗ ") + `[${b.gate}] ${b.message}`);
    console.log(c.gray("    check them off as they land, or in bulk: ") + c.cyan(`doctrina change tick ${id} --all`));
  }

  // Advisory (never gates): accepted ADRs citing the touched capabilities.
  const caps = [...new Set(deltaFiles.map((p) => parseCapabilityFromDelta(read(p), p)).filter(Boolean))].sort();
  console.log("");
  printAdrCheckpoint(projectRoot, caps, { c });

  console.log("");
  if (failures === 0) {
    console.log(c.green("ok") + ` ${id} is ready to close: ` + c.cyan(`doctrina close ${id}`));
    return 0;
  }
  console.log(c.red("fail") + ` ${failures} area${failures === 1 ? "" : "s"} would block the close — fix them first`);
  return 1;
}

// Bulk checkbox marking (operator review 2026-07-19 §3.5: "marcar checkbox
// não tem comando nenhum" — it was sed/Python by hand). With no args it
// LISTS the unchecked boxes with ordinals; `tick <id> 2 5` checks those;
// `tick <id> --all` checks everything (tasks.md + the proposal's
// ## Verification). Ticking is a claim of completion — the honest gate is
// still archive/verify; this only removes the mechanical friction.
function changeTick(args, flags) {
  const id = args[0];
  if (!id) {
    console.error(c.red("error:") + " change tick requires <id> [ordinals... | --all]");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  // Unified ordinal space over both files, in reading order: every unchecked
  // `- [ ]` in tasks.md, then in the proposal's ## Verification section.
  const files = [
    { label: "tasks.md", path: path.join(changeDir, "tasks.md"), section: null },
    { label: "proposal.md ## Verification", path: path.join(changeDir, "proposal.md"), section: "Verification" },
  ];
  const boxes = [];
  for (const f of files) {
    if (!isFile(f.path)) continue;
    const lines = read(f.path).split(/\r?\n/);
    const inScope = f.section === null
      ? () => true
      : (() => {
          const scoped = new Set();
          let inSection = false;
          for (let i = 0; i < lines.length; i++) {
            if (/^##\s+/.test(lines[i])) inSection = new RegExp(`^##\\s+${f.section}\\b`, "i").test(lines[i]);
            else if (inSection) scoped.add(i);
          }
          return (i) => scoped.has(i);
        })();
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*-\s*\[ \]/.test(lines[i]) && inScope(i)) {
        boxes.push({ file: f, lineIndex: i, text: lines[i].replace(/^\s*-\s*\[ \]\s*/, "") });
      }
    }
  }

  if (boxes.length === 0) {
    console.log(c.green("ok") + " no unchecked boxes in tasks.md or the proposal's ## Verification");
    return 0;
  }

  const all = flagBool(flags, "all", false);
  const ordinals = args.slice(1).map(Number);
  const isPlaceholder = (box) => box.text.trim() === "";
  if (!all && ordinals.length === 0) {
    console.log(c.bold(`Unchecked boxes in ${id}:`));
    console.log("");
    for (let i = 0; i < boxes.length; i++) {
      const label = isPlaceholder(boxes[i])
        ? c.yellow("(scaffold placeholder — write the real task, or delete the line)")
        : boxes[i].text;
      console.log(`  ${String(i + 1).padStart(3)}. ${label}  ${c.gray(`[${boxes[i].file.label}]`)}`);
    }
    console.log("");
    console.log(c.gray("tick some: ") + c.cyan(`doctrina change tick ${id} 1 3`) + c.gray(" · all: ") + c.cyan(`doctrina change tick ${id} --all`));
    return 0;
  }

  const picked = all ? boxes.map((_, i) => i + 1) : ordinals;
  for (const n of picked) {
    if (!Number.isInteger(n) || n < 1 || n > boxes.length) {
      console.error(c.red("error:") + ` no box #${n} (1..${boxes.length} — run \`doctrina change tick ${id}\` to list)`);
      return 2;
    }
  }
  // Ticking an empty scaffold placeholder is a meaningless claim — it is how
  // a hollow change games the archive gate. Refuse (all-or-nothing) and name
  // the fix; analyze/close hard-fail on the placeholders regardless.
  const empties = picked.filter((n) => isPlaceholder(boxes[n - 1]));
  if (empties.length > 0) {
    console.error(c.red("error:") + ` box${empties.length === 1 ? "" : "es"} ${empties.join(", ")} ${empties.length === 1 ? "is a" : "are"} scaffold placeholder${empties.length === 1 ? "" : "s"} with no text — nothing was ticked`);
    console.error(c.gray("hint: ") + "write the real task on each line (or delete it), then tick");
    return 2;
  }

  // Group edits per file so each file is read/written once.
  const byPath = new Map();
  for (const n of picked) {
    const box = boxes[n - 1];
    if (!byPath.has(box.file.path)) byPath.set(box.file.path, []);
    byPath.get(box.file.path).push(box);
  }
  for (const [filePath, hits] of byPath) {
    const lines = read(filePath).split(/\r?\n/);
    for (const box of hits) {
      lines[box.lineIndex] = lines[box.lineIndex].replace(/\[ \]/, "[x]");
    }
    write(filePath, lines.join("\n"), { force: true });
  }
  console.log(c.green("ticked ") + `${picked.length} box${picked.length === 1 ? "" : "es"} in ${byPath.size} file${byPath.size === 1 ? "" : "s"}`);
  return 0;
}

function changeArchive(args, flags) {
  const id = args[0];
  if (!id) {
    console.error(c.red("error:") + " change archive requires <id>");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  // Verification gate. "Done" is a claim until it is checked. Archiving is
  // the act of declaring a change finished, so it must refuse while any
  // task (including closing steps) or any declared verification item is
  // still unchecked. This is the difference between "boxes marked" and
  // "verification passed" the framework was faulted for collapsing.
  // Preconditions from the shared map (C6): structure AND verification.
  // Reaching archive directly used to skip the structural check that the
  // `close` path always ran first, so the same state was guarded
  // differently depending on the route taken. --force is the escape hatch
  // for both, and records the gap.
  if (!enforceTransition(projectRoot, id, changeDir, "archive", flags)) return 1;

  const date = today();
  const archiveName = `${date}-${id}`;
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive", archiveName);
  if (exists(archiveDir)) {
    console.error(c.red("error:") + ` archive target already exists: ${relPath(projectRoot, archiveDir)}`);
    return 1;
  }

  // Flip the proposal Status before the move. `apply` only flips it when no
  // delta fell back to a manual merge, so a change whose merges were manual
  // (the common case before the ops-block docs) reached the archive still
  // saying "proposed" — the index recorded applied, the file lied. Archiving
  // IS the declaration that the change went in; stamp the file to match.
  const proposalPathLive = path.join(changeDir, "proposal.md");
  if (exists(proposalPathLive)) {
    const txt = read(proposalPathLive);
    const updated = txt.replace(
      /^(-\s+\*\*Status:\*\*)\s+proposed\s*$/m,
      `$1 applied\n- **Applied:** ${date}`,
    );
    if (updated !== txt) {
      write(proposalPathLive, updated, { force: true });
      console.log(c.green("status") + " proposal.md → applied (stamped at archive)");
    }
  }

  move(changeDir, archiveDir);
  console.log(c.green("archived") + ` ${relPath(projectRoot, archiveDir)}`);

  // Collect affected specs from delta files for the index entry
  const deltaFiles = walk(path.join(archiveDir, "specs")).filter((p) => p.endsWith("delta.md"));
  const specsAffected = [];
  let title = id;
  for (const deltaPath of deltaFiles) {
    const text = read(deltaPath);
    const op = parseOperation(text) ?? "MODIFIED";
    const capability = parseCapabilityFromDelta(text, deltaPath);
    if (capability) specsAffected.push({ capability, operation: op });
  }
  // Title from proposal
  const proposal = path.join(archiveDir, "proposal.md");
  if (exists(proposal)) {
    // First line may end in \r on Windows checkouts (autocrlf); split on
    // either ending so the title regex is not defeated by a stray \r.
    const firstLine = read(proposal).split(/\r?\n/, 1)[0] ?? "";
    // The id itself may contain hyphens (NNNN-slug), so match it as \S+
    // and split on the em-dash/hyphen separator that follows whitespace.
    const m = firstLine.match(/^#\s+Change\s+\S+\s*[—-]\s*(.+)$/);
    if (m) title = m[1].trim();
  }

  // Append a one-line summary to the archive ledger so history stays
  // scannable without opening folders (the archive is out of the default
  // read path; the ledger is the cheap way back in).
  const ledgerPath = path.join(projectRoot, ".doctrina", "changes", "archive", "LEDGER.md");
  if (!exists(ledgerPath)) {
    write(ledgerPath,
      "# Change ledger\n\n" +
      "One line per archived change, newest last. Appended by\n" +
      "`doctrina change archive`; edit freely, the CLI only appends.\n\n");
  }
  const specsSummary = specsAffected.length > 0
    ? ` (specs: ${specsAffected.map((s) => `${s.capability} ${s.operation}`).join(", ")})`
    : "";
  write(ledgerPath, read(ledgerPath) + `- ${date} — ${id} — ${title}${specsSummary}\n`, { force: true });
  console.log(c.green("ledger") + ` +1 line in ${relPath(projectRoot, ledgerPath)}`);

  const index = idx.load(projectRoot);
  idx.moveChangeToArchive(index, id, {
    id,
    title,
    path: `.doctrina/changes/archive/${archiveName}`,
    status: "applied",
    applied: date,
    specs_affected: specsAffected,
  });
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + " change archived");
  return 0;
}

// Abandon an open change: delete the folder AND the index entry in one step,
// and record the abandonment in the ledger so the history shows the dead end
// instead of a silent gap. This is the missing inverse of `change new` — the
// review had to delete a stray folder and hand-edit index.json (G6).
async function changeAbandon(args, flags) {
  const id = args[0];
  if (!id) {
    console.error(c.red("error:") + " change abandon requires <id>");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  // Consent before destruction (audit item C9). This deletes work with no
  // undo — the ledger line is good practice and is not a substitute for
  // being asked. Off a terminal there is nobody to ask, so `--force` is
  // required: silence is not consent.
  const force = flagBool(flags, "force", false);
  if (!force) {
    const doomed = walk(changeDir);
    console.log(c.yellow("About to delete") + ` ${relPath(projectRoot, changeDir)} — ${doomed.length} file${doomed.length === 1 ? "" : "s"}:`);
    for (const f of doomed.slice(0, 10)) console.log(`    ${c.gray(relPath(changeDir, f))}`);
    if (doomed.length > 10) console.log(c.gray(`    … and ${doomed.length - 10} more`));
    console.log(c.gray("This cannot be undone (the change is deleted, not archived)."));

    if (!isInteractive()) {
      console.error("");
      console.error(c.red("error:") + " refusing to delete without confirmation");
      console.error(c.gray("hint: ") + `re-run with ${c.cyan("--force")} to abandon non-interactively`);
      return EXIT.USAGE;
    }
    const ok = await confirm(`Abandon "${id}"?`, { defaultYes: false, whenNonInteractive: false });
    if (!ok) {
      console.log(c.gray("aborted — nothing was deleted"));
      return EXIT.OK;
    }
  }

  const reason = flagString(flags, "reason") ?? "";
  const date = today();

  remove(changeDir);
  console.log(c.green("removed") + ` ${relPath(projectRoot, changeDir)}`);

  // Ledger line so the abandonment is part of the visible history.
  const ledgerPath = path.join(projectRoot, ".doctrina", "changes", "archive", "LEDGER.md");
  if (!exists(ledgerPath)) {
    write(ledgerPath,
      "# Change ledger\n\n" +
      "One line per archived change, newest last. Appended by\n" +
      "`doctrina change archive`; edit freely, the CLI only appends.\n\n");
  }
  const reasonSuffix = reason ? ` — ${reason}` : "";
  write(ledgerPath, read(ledgerPath) + `- ${date} — ${id} — abandoned${reasonSuffix}\n`, { force: true });
  console.log(c.green("ledger") + ` +1 line in ${relPath(projectRoot, ledgerPath)}`);

  // Drop the change entry; rebuild from the tree so nothing drifts.
  const current = idx.load(projectRoot);
  const derived = deriveIndex(projectRoot, current);
  derived.last_updated = date;
  idx.save(projectRoot, derived);
  console.log(c.green("indexed") + ` change "${id}" removed from index.json`);
  return 0;
}

function changeDiff(args, _flags) {
  const id = args[0];
  if (!id) {
    console.error(c.red("error:") + " change diff requires <id>");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  const deltaFiles = walk(path.join(changeDir, "specs")).filter((p) => p.endsWith("delta.md"));
  if (deltaFiles.length === 0) {
    console.log(c.gray("no spec deltas in this change; nothing to diff"));
    return 0;
  }

  let errors = 0;
  for (const deltaPath of deltaFiles) {
    const rel = relPath(changeDir, deltaPath);
    const text = read(deltaPath);
    const op = parseOperation(text);
    const capability = parseCapabilityFromDelta(text, deltaPath);
    if (!op || !capability) {
      console.error(c.red("error:") + ` cannot parse Operation or capability in ${rel}`);
      errors += 1;
      continue;
    }
    const targetPath = path.join(projectRoot, ".doctrina", "specs", capability, "spec.md");
    const targetRel = relPath(projectRoot, targetPath);
    const body = extractDeltaBody(text);
    const bodyLines = body.split("\n").filter((l, i, a) => !(i === a.length - 1 && l === "")).length;

    console.log("");
    if (op === "ADDED") {
      const conflict = exists(targetPath) ? c.red(" (conflict: target already exists)") : "";
      console.log(c.green(`ADDED`) + ` ${targetRel} (+${bodyLines} lines)${conflict}`);
    } else if (op === "REMOVED") {
      if (!exists(targetPath)) {
        console.log(c.yellow("REMOVED") + ` ${targetRel} (target already missing)`);
      } else {
        console.log(c.red("REMOVED") + ` ${targetRel} (-${lineCount(targetPath)} lines)`);
      }
    } else {
      if (!exists(targetPath)) {
        console.error(c.red("error:") + ` MODIFIED delta targets missing spec ${targetRel}`);
        errors += 1;
        continue;
      }
      console.log(c.yellow("MODIFIED") + ` ${targetRel}`);
      console.log(c.gray("note: the delta body is a fragment to merge — '-' lines are current"));
      console.log(c.gray("      spec content absent from the delta, not necessarily removals."));
      const out = formatUnified(diffLines(read(targetPath), body), {
        aLabel: targetRel,
        bLabel: relPath(projectRoot, deltaPath),
      });
      console.log(out);
    }
  }

  console.log("");
  return errors > 0 ? 1 : 0;
}


function extractDeltaBody(text) {
  // The delta separates headers from the spec body with a `---` line.
  const idxSep = text.indexOf("\n---\n");
  if (idxSep < 0) return text;
  return text.slice(idxSep + 5).replace(/^\n+/, "");
}


// Reasons a change is not finished enough to archive. Counts unchecked
// GitHub-style checkboxes (`- [ ]`) in tasks.md (every task, including the
// closing steps) and in the proposal's "## Verification" section. Returns
// a list of human-readable blocker strings; empty means clear to archive.
function collectArchiveBlockers(changeDir) {
  const blockers = [];
  const countUnchecked = (s) => (s.match(/^\s*-\s*\[ \]/gm) ?? []).length;

  const tasksPath = path.join(changeDir, "tasks.md");
  if (exists(tasksPath)) {
    const n = countUnchecked(read(tasksPath));
    if (n > 0) blockers.push(`${n} unchecked task${n === 1 ? "" : "s"} in tasks.md (closing steps count)`);
  }

  const proposalPath = path.join(changeDir, "proposal.md");
  if (exists(proposalPath)) {
    const n = countUnchecked(getSection(read(proposalPath), "Verification"));
    if (n > 0) blockers.push(`${n} unmet verification item${n === 1 ? "" : "s"} in proposal.md (## Verification)`);
  }
  return blockers;
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
}

export const help = `
Usage: doctrina change <subcommand> [args]

Subcommands:
  new <id> "<title>"     Open a new change proposal at .doctrina/changes/<id>/
                         (--chore / --no-spec: a spec-less change for infra /
                         docs / build that still gets a proposal + ledger;
                         --design: also scaffold design.md, opt-in)
  apply <id...>          Apply spec deltas: ADDED writes the full body (it
                         also REPLACES a target that is still the untouched
                         \`spec new\` scaffold — the canonical new-capability
                         flow; real content refuses), REMOVED deletes,
                         MODIFIED with an \`\`\`ops block is applied mechanically
                         (set-header / bump-version / set-criterion / ...),
                         MODIFIED without one prints a manual-merge pointer.
                         On any spec write the index is rebuilt from the tree.
  archive <id...>        Move the change to .doctrina/changes/archive/YYYY-MM-DD-<id>/
  check <id...>          Pre-close dry-run, read-only: analyze's structural
                         checks + every ops block executed in memory against
                         its target + the archive gate preview + an advisory
                         list of accepted ADRs citing the touched capabilities.
                         Everything close would refuse, listed BEFORE it runs.
  tick <id> [n... |--all]  List the unchecked boxes (tasks.md + proposal
                         ## Verification) with ordinals; tick the given ones,
                         or every one with --all. No args = list only.
  abandon <id>           Delete an open change folder and its index entry, and
                         record the abandonment in the ledger ([--reason "..."]).
  diff <id>              Preview every spec delta: line diff for MODIFIED,
                         summary for ADDED/REMOVED. Read-only.

apply / archive / check accept multiple ids (batch close of a backlog); the
exit code is the worst per-id result.

A MODIFIED delta may carry a fenced operations block that \`apply\` executes:
  \`\`\`ops
  set-header Implementation: verified — durable adapter (\`src/db.ts\`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by \`test/x.test.ts\`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  \`\`\`
append-* ops resolve numbering/position at apply time, so concurrent open
changes appending to the same spec cannot collide.

Options:
  --force                Overwrite existing files (where applicable)
  --chore, --no-spec     With new, open a spec-less chore change
  --design               With new, also scaffold design.md (opt-in)
  --reason "<text>"      With abandon, the reason recorded in the ledger
`;

// Re-export parsers so scan.js (index rebuild) can reuse them, and the
// scaffold so `work` can open a change without duplicating the logic.
export { parseOperation, parseCapabilityFromDelta, isUntouchedScaffold } from "../lib/change-model.js";
export { changeNew } from "../lib/change-ops.js";
