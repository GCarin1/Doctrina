import path from "node:path";
import process from "node:process";
import { exists, isDir, lineCount, mkdirp, move, read, relPath, remove, walk, write } from "../lib/fs-ops.js";
import { diffLines, formatUnified } from "../lib/diff.js";
import { locateTemplatesDir, loadTemplateTree, materialiseEntry } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex } from "../lib/scan.js";
import { extractOps, applyOps } from "../lib/spec-ops.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["new", "apply", "archive", "diff", "abandon"];

export async function run(positional, flags) {
  const sub = positional[0];
  switch (sub) {
    case "new":
      return changeNew(positional.slice(1), flags);
    case "apply":
      return changeApply(positional.slice(1), flags);
    case "archive":
      return changeArchive(positional.slice(1), flags);
    case "diff":
      return changeDiff(positional.slice(1), flags);
    case "abandon":
      return changeAbandon(positional.slice(1), flags);
    default:
      console.error(c.red("error:") + ` unknown change subcommand "${sub ?? ""}"`);
      const guess = suggest(sub, SUBCOMMANDS);
      console.error(c.gray("hint: ") + (guess
        ? `did you mean \`doctrina change ${guess}\`?`
        : `available: ${SUBCOMMANDS.join(", ")}`));
      return 2;
  }
}

function changeNew(args, flags) {
  const id = args[0];
  const title = args.slice(1).join(" ").trim();
  if (!id) {
    console.error(c.red("error:") + " change new requires <id> and \"<title>\"");
    return 2;
  }
  if (!title) {
    console.error(c.red("error:") + " change new requires a title (quote it if it contains spaces)");
    return 2;
  }

  const force = flagBool(flags, "force", false);
  // A chore is a spec-less change (infra / docs / build / migration) — review
  // G9. It runs the full proposal → apply → archive → ledger lifecycle (so the
  // history shows it) without forcing a fake spec delta. The empty specs/ dir
  // is kept so `change apply`'s zero-delta path flips it to applied unchanged.
  const chore = flagBool(flags, "chore", false) || flagBool(flags, "no-spec", false);
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (exists(changeDir) && !force) {
    console.error(c.red("error:") + ` change "${id}" already exists at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const date = today();
  const tokens = { CHANGE_ID: id, CHANGE_TITLE: title, DATE: date, CAPABILITY: "" };

  const tree = loadTemplateTree(templatesDir, "change");
  for (const entry of tree) {
    if (entry.relativePath === "spec-delta.md.template") continue;
    const written = materialiseEntry(entry, changeDir, tokens, { force });
    console.log(c.green("created") + ` ${relPath(projectRoot, written)}`);
  }
  mkdirp(path.join(changeDir, "specs"));

  // Stamp the proposal so a chore is honest in the artifact, not just the CLI.
  if (chore) {
    const proposalPath = path.join(changeDir, "proposal.md");
    if (exists(proposalPath)) {
      const txt = read(proposalPath);
      const updated = txt.replace(/^(-\s+\*\*Affects specs:\*\*).*$/m, "$1 (none — chore)");
      if (updated !== txt) write(proposalPath, updated, { force: true });
    }
  }

  const index = idx.load(projectRoot);
  idx.addChange(index, { id, title, path: `.doctrina/changes/${id}`, status: "proposed", opened: date });
  idx.touch(index, date);
  idx.save(projectRoot, index);

  console.log("");
  if (chore) {
    console.log(c.bold("Chore opened.") + " No spec deltas expected — implement, check the tasks, then " +
      c.cyan(`doctrina change apply ${id}`) + " and " + c.cyan(`doctrina change archive ${id}`) + ".");
  } else {
    console.log(c.bold("Change opened.") + " Add spec deltas under " +
      c.cyan(`.doctrina/changes/${id}/specs/<capability>/delta.md`));
  }
  return 0;
}

function changeApply(args, _flags) {
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
      if (exists(targetPath)) {
        console.error(c.red("error:") + ` ADDED delta targets existing spec ${relPath(projectRoot, targetPath)} — refusing to overwrite`);
        errors += 1;
        continue;
      }
      const body = extractDeltaBody(text);
      write(targetPath, body, { force: false });
      writes += 1;
      console.log(c.green("applied[ADDED]") + ` ${relPath(projectRoot, targetPath)}`);
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
  // --force is the escape hatch: it archives anyway and records the gap.
  const force = flagBool(flags, "force", false);
  const blockers = collectArchiveBlockers(changeDir);
  if (blockers.length > 0) {
    if (!force) {
      console.error(c.red("error:") + ` refusing to archive "${id}" — verification incomplete:`);
      for (const b of blockers) console.error(`  - ${b}`);
      console.error(
        c.gray("hint: ") +
          "finish and check the items, or pass --force to archive anyway (records the gap)",
      );
      return 1;
    }
    console.log(c.yellow("warn:") + ` archiving "${id}" with verification incomplete (--force):`);
    for (const b of blockers) console.log(c.yellow("  - ") + b);
  }

  const date = today();
  const archiveName = `${date}-${id}`;
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive", archiveName);
  if (exists(archiveDir)) {
    console.error(c.red("error:") + ` archive target already exists: ${relPath(projectRoot, archiveDir)}`);
    return 1;
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
function changeAbandon(args, flags) {
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

function parseOperation(text) {
  const m = text.match(/^\*\*Operation:\*\*\s*([A-Z]+)/m);
  if (!m) return null;
  const op = m[1];
  if (op === "ADDED" || op === "MODIFIED" || op === "REMOVED") return op;
  return null;
}

function parseCapabilityFromDelta(text, deltaPath) {
  // Prefer the explicit header "# Spec Delta — capability: <name>"
  const m = text.match(/^#\s+Spec Delta\s*[—-]\s*capability:\s*([a-z][a-z0-9-]*)/m);
  if (m) return m[1];
  // Fall back to the parent directory name of the delta file
  const parent = path.basename(path.dirname(deltaPath));
  if (/^[a-z][a-z0-9-]*$/.test(parent)) return parent;
  return null;
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
    const n = countUnchecked(extractSection(read(proposalPath), "Verification"));
    if (n > 0) blockers.push(`${n} unmet verification item${n === 1 ? "" : "s"} in proposal.md (## Verification)`);
  }
  return blockers;
}

// Return the body of a "## <name>" section (lines after the heading up to
// the next "## " heading). Empty string when the section is absent.
function extractSection(text, name) {
  const lines = text.split(/\r?\n/);
  const head = new RegExp(`^##\\s+${name}\\b`, "i");
  let inSection = false;
  const out = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = head.test(line);
      continue;
    }
    if (inSection) out.push(line);
  }
  return out.join("\n");
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
}

export const help = `
Usage: doctrina change <subcommand> [args]

Subcommands:
  new <id> "<title>"     Open a new change proposal at .doctrina/changes/<id>/
                         (--chore / --no-spec: a spec-less change for infra /
                         docs / build that still gets a proposal + ledger)
  apply <id>             Apply spec deltas: ADDED writes, REMOVED deletes,
                         MODIFIED with an \`\`\`ops block is applied mechanically
                         (set-header / bump-version / set-criterion / ...),
                         MODIFIED without one prints a manual-merge pointer.
                         On any spec write the index is rebuilt from the tree.
  archive <id>           Move the change to .doctrina/changes/archive/YYYY-MM-DD-<id>/
  abandon <id>           Delete an open change folder and its index entry, and
                         record the abandonment in the ledger ([--reason "..."]).
  diff <id>              Preview every spec delta: line diff for MODIFIED,
                         summary for ADDED/REMOVED. Read-only.

A MODIFIED delta may carry a fenced operations block that \`apply\` executes:
  \`\`\`ops
  set-header Implementation: verified — durable adapter (\`src/db.ts\`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by \`test/x.test.ts\`
  \`\`\`

Options:
  --force                Overwrite existing files (where applicable)
  --chore, --no-spec     With new, open a spec-less chore change
  --reason "<text>"      With abandon, the reason recorded in the ledger
`;

// Re-export parsers so scan.js (index rebuild) can reuse them, and the
// scaffold so `work` can open a change without duplicating the logic.
export { parseOperation, parseCapabilityFromDelta, changeNew };
