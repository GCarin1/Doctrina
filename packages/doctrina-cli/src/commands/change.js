import path from "node:path";
import process from "node:process";
import { exists, isDir, lineCount, mkdirp, move, read, relPath, remove, walk, write } from "../lib/fs-ops.js";
import { diffLines, formatUnified } from "../lib/diff.js";
import { locateTemplatesDir, loadTemplateTree, materialiseEntry } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["new", "apply", "archive", "diff"];

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

  const index = idx.load(projectRoot);
  idx.addChange(index, { id, title, path: `.doctrina/changes/${id}`, status: "proposed", opened: date });
  idx.touch(index, date);
  idx.save(projectRoot, index);

  console.log("");
  console.log(c.bold("Change opened.") + " Add spec deltas under " +
    c.cyan(`.doctrina/changes/${id}/specs/<capability>/delta.md`));
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
      console.log(c.yellow("manual[MODIFIED]") + ` merge ${relPath(projectRoot, deltaPath)} into ${relPath(projectRoot, targetPath)} by hand`);
      manual += 1;
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

  // Update the index when specs changed (ADDED/REMOVED) and/or the proposal
  // flipped to applied. The change entry's status must mirror the proposal —
  // the same value `index rebuild` derives from the file — or the index
  // drifts from the tree in the apply→archive window (caught by
  // `index rebuild --check`, e.g. in the pre-commit hook).
  if (writes > 0 || flippedToApplied) {
    const index = idx.load(projectRoot);
    if (writes > 0) {
      for (const deltaPath of deltaFiles) {
        const text = read(deltaPath);
        const op = parseOperation(text);
        const capability = parseCapabilityFromDelta(text, deltaPath);
        if (!capability) continue;
        if (op === "ADDED") {
          idx.addSpec(index, {
            id: capability,
            path: `.doctrina/specs/${capability}/spec.md`,
            status: "active",
            version: "0.1.0",
            last_updated: date,
          });
        } else if (op === "REMOVED") {
          idx.removeSpec(index, capability);
        }
      }
    }
    if (flippedToApplied) {
      const entry = index.artifacts.changes.find((ch) => ch.id === id);
      if (entry) entry.status = "applied";
    }
    idx.touch(index, date);
    idx.save(projectRoot, index);
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
  apply <id>             Apply spec deltas (ADDED writes, REMOVED deletes, MODIFIED is manual)
  archive <id>           Move the change to .doctrina/changes/archive/YYYY-MM-DD-<id>/
  diff <id>              Preview every spec delta: line diff for MODIFIED,
                         summary for ADDED/REMOVED. Read-only.

Options:
  --force                Overwrite existing files (where applicable)
`;

// Re-export parsers so scan.js (index rebuild) can reuse them, and the
// scaffold so `work` can open a change without duplicating the logic.
export { parseOperation, parseCapabilityFromDelta, changeNew };
