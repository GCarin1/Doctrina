// @ts-check
import { unwrittenSections, getHeader, setHeader } from "../lib/doc-model.js";
import path from "node:path";
import process from "node:process";
import { exists, read, relPath, write } from "../lib/fs-ops.js";
import { walk } from "../lib/fs-ops.js";
import { readTemplate, locateTemplatesDir, substitute } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { today, slugify, padNumber } from "../lib/dates.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { flagBool } from "../lib/args.js";
import { parseAdrScope, decisionEntry } from "../lib/scan.js";

const SUBCOMMANDS = ["new", "supersede", "accept", "land", "list", "scope"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "write"], string: [] };

export async function run(positional, cmdFlags) {
  const sub = positional[0];
  switch (sub) {
    case "new":
      return decisionNew(positional.slice(1));
    case "supersede":
      return decisionSupersede(positional.slice(1));
    case "accept":
      return decisionAccept(positional.slice(1));
    case "land":
      return decisionLand(positional.slice(1));
    case "scope":
      return decisionScope(positional.slice(1), cmdFlags);
    case "list":
      return decisionList();
    default:
      console.error(c.red("error:") + ` unknown decision subcommand "${sub ?? ""}"`);
      const guess = suggest(sub, SUBCOMMANDS);
      console.error(c.gray("hint: ") + (guess
        ? `did you mean \`doctrina decision ${guess}\`?`
        : `available: ${SUBCOMMANDS.join(", ")}`));
      return 2;
  }
}

function decisionNew(args) {
  const title = args.join(" ").trim();
  if (!title) {
    console.error(c.red("error:") + " decision new requires \"<title>\"");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const next = nextDecisionNumber(projectRoot);
  const date = today();
  const slug = slugify(title);
  const filename = `${next}-${slug}.md`;
  const targetPath = path.join(projectRoot, ".doctrina", "decisions", filename);
  if (exists(targetPath)) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, targetPath)} already exists`);
    return 1;
  }

  const tpl = readTemplate(projectRoot, "decision.md.template").body;
  const body = substitute(tpl, {
    DECISION_NUMBER: next,
    DECISION_TITLE: title,
    DECISION_SLUG: slug,
    DATE: date,
  });
  write(targetPath, body, { force: false });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}`);

  // Register through the SAME deriver the index rebuild uses. Assembling a
  // look-alike entry here is how a field added to the deriver turns every
  // freshly created ADR into index drift the moment it is written.
  const index = idx.load(projectRoot);
  idx.addDecision(index, decisionEntry(body, filename, null, date));
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` decision ${next}`);
  return 0;
}

function decisionSupersede(args) {
  const target = args[0];
  if (!target) {
    console.error(c.red("error:") + " decision supersede requires the target ADR number (e.g. 0003)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const padded = padNumber(parseInt(target, 10));
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const files = walk(adrDir);
  const oldFile = files.find((f) => path.basename(f).startsWith(`${padded}-`));
  if (!oldFile) {
    console.error(c.red("error:") + ` no ADR found with number ${padded} in ${relPath(projectRoot, adrDir)}`);
    return 1;
  }
  const oldText = read(oldFile);
  const oldStatusValue = getHeader(oldText, "Status");
  if (oldStatusValue === null) {
    console.error(c.red("error:") + ` ADR at ${relPath(projectRoot, oldFile)} has no Status: header`);
    return 1;
  }
  const oldStatus = oldStatusValue;
  if (oldStatus.toLowerCase().startsWith("superseded")) {
    console.error(c.red("error:") + ` ADR ${padded} is already superseded`);
    return 1;
  }

  // Title for new ADR is read from argv after the target number, or prompted.
  const title = args.slice(1).join(" ").trim();
  if (!title) {
    console.error(c.red("error:") + " supply the new ADR title as the second argument");
    return 2;
  }

  // Create the new ADR using the same path the `new` flow uses.
  const next = nextDecisionNumber(projectRoot);
  const date = today();
  const slug = slugify(title);
  const filename = `${next}-${slug}.md`;
  const newPath = path.join(adrDir, filename);
  const templatesDir = locateTemplatesDir();
  const tpl = read(path.join(templatesDir, "decision.md.template"));
  let body = substitute(tpl, {
    DECISION_NUMBER: next,
    DECISION_TITLE: title,
    DECISION_SLUG: slug,
    DATE: date,
  });
  // Inject Supersedes link
  body = body.replace(/(\*\*Supersedes:\*\*)\s+—/, `$1 ${padded}`);
  write(newPath, body, { force: false });
  console.log(c.green("created") + ` ${relPath(projectRoot, newPath)}`);

  // Mutate ONLY the Status: and Superseded by: headers of the old ADR.
  // Both go through the document model, so an ADR written with a slightly
  // off header form is still updated rather than silently skipped (M3).
  const withStatus = setHeader(oldText, "Status", `superseded by ${next}`) ?? oldText;
  const updated = setHeader(withStatus, "Superseded by", String(next)) ?? withStatus;
  write(oldFile, updated, { force: true });
  console.log(c.green("updated") + ` ${relPath(projectRoot, oldFile)} status -> superseded by ${next}`);

  // Update index
  const index = idx.load(projectRoot);
  idx.addDecision(index, decisionEntry(body, filename, null, date));
  idx.updateDecision(index, padded, () => ({
    status: `superseded by ${next}`,
    superseded_by: next,
  }));
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` supersession recorded`);
  return 0;
}

function decisionAccept(args) {
  const target = args[0];
  if (!target) {
    console.error(c.red("error:") + " decision accept requires the target ADR number (e.g. 0003)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const padded = padNumber(parseInt(target, 10));
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const file = walk(adrDir).find((f) => path.basename(f).startsWith(`${padded}-`));
  if (!file) {
    console.error(c.red("error:") + ` no ADR found with number ${padded} in ${relPath(projectRoot, adrDir)}`);
    return 1;
  }
  const text = read(file);
  const statusValue = getHeader(text, "Status");
  if (statusValue === null) {
    console.error(c.red("error:") + ` ADR at ${relPath(projectRoot, file)} has no Status: header`);
    return 1;
  }
  const status = statusValue.toLowerCase();
  if (status !== "proposed") {
    console.error(c.red("error:") + ` ADR ${padded} is "${statusValue}", not "proposed" — nothing to accept`);
    return 1;
  }

  // An accepted ADR is IMMUTABLE, becomes a standing rule in `prime --rules`,
  // and loads into every context pack it is scoped to (ADR 0022). Accepting
  // one whose body is still the template was accepting a decision nobody had
  // written down (change 0065). `analyze` has had exactly this guard for a
  // change proposal since the beginning; the more consequential document was
  // the one without it.
  const unwritten = unwrittenSections(text, ["Context", "Decision", "Consequences"], {
    template: "decision.md.template",
  });
  if (unwritten.length > 0) {
    console.error(c.red("error:") +
      ` ADR ${padded} still carries the template in ${unwritten.map((x) => `## ${x}`).join(", ")}`);
    console.error(c.gray("hint: ") +
      `write the decision before accepting it — an accepted ADR is immutable, becomes a ` +
      `standing rule, and loads into every pack it governs (${relPath(projectRoot, file)})`);
    return 1;
  }

  // Mutate ONLY the Status: header; the body stays immutable.
  write(file, setHeader(text, "Status", "accepted") ?? text, { force: true });
  console.log(c.green("accepted") + ` ${relPath(projectRoot, file)}`);

  const date = today();
  const index = idx.load(projectRoot);
  // Re-derive the whole entry, not just the status. Between `decision new` and
  // `decision accept` the author writes the body — which is now REQUIRED, so
  // it is the normal flow, not the exception — and the entry's summary and
  // scope are derived from that body. Updating only the status left the index
  // holding the scaffold's summary, and `validate` reported drift the author
  // had no reason to expect (change 0065).
  const accepted = decisionEntry(read(file), path.basename(file), null, date);
  idx.updateDecision(index, padded, () => accepted);
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` decision ${padded} -> accepted`);
  return 0;
}

// Record that an accepted ADR is now implemented and verified, without
// editing the immutable body. Mutates ONLY the **Landed:** header line (the
// same "headers are updatable, the decision prose is not" pattern that accept
// and supersede already use), stamping today's date plus any cited proof
// paths. This closes the gap where a design-time ADR ("Evidence: n/a — no
// implementation yet") had no first-class way to record that reality caught up
// short of a heavyweight supersede. (3.4)
function decisionLand(args) {
  const target = args[0];
  if (!target) {
    console.error(c.red("error:") + " decision land requires the target ADR number (e.g. 0003)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const padded = padNumber(parseInt(target, 10));
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const file = walk(adrDir).find((f) => path.basename(f).startsWith(`${padded}-`));
  if (!file) {
    console.error(c.red("error:") + ` no ADR found with number ${padded} in ${relPath(projectRoot, adrDir)}`);
    return 1;
  }
  const text = read(file);
  const statusValue = getHeader(text, "Status");
  if (statusValue === null) {
    console.error(c.red("error:") + ` ADR at ${relPath(projectRoot, file)} has no Status: header`);
    return 1;
  }
  const status = statusValue.toLowerCase();
  if (status !== "accepted") {
    console.error(
      c.red("error:") +
        ` ADR ${padded} is "${statusValue}", not "accepted" — accept it before recording that it landed`,
    );
    return 1;
  }

  const date = today();
  const proofPaths = args.slice(1).filter(Boolean);
  const cited = proofPaths.map((p) => `\`${p}\``).join(", ");
  const landedValue = cited ? `${date} — ${cited}` : date;

  // Rewrite the existing Landed header, or insert one (after Evidence, else
  // after Status) for ADRs that predate the field. The body stays untouched.
  let updated;
  if (/^-\s+\*\*Landed:\*\*/m.test(text)) {
    updated = text.replace(/^(-\s+\*\*Landed:\*\*)\s+.*$/m, `$1 ${landedValue}`);
  } else if (/^-\s+\*\*Evidence:\*\*.*$/m.test(text)) {
    updated = text.replace(/^(-\s+\*\*Evidence:\*\*.*)$/m, `$1\n- **Landed:** ${landedValue}`);
  } else {
    updated = text.replace(/^(\s*-\s+\*\*Status:\*\*.*)$/m, `$1\n- **Landed:** ${landedValue}`);
  }
  write(file, updated, { force: true });
  console.log(c.green("landed") + ` ${relPath(projectRoot, file)} on ${date}`);

  const index = idx.load(projectRoot);
  // Store the same value the header now carries, so the index matches what
  // `index rebuild` would derive from the file (no perpetual drift).
  idx.updateDecision(index, padded, () => ({ landed: landedValue }));
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` decision ${padded} landed`);

  // Parity with `validate`: cited proof that does not resolve is a dangling
  // citation, surfaced now rather than at the next validate.
  for (const p of proofPaths) {
    const candidates = [path.resolve(path.dirname(file), p), path.resolve(projectRoot, p)];
    if (!candidates.some(exists)) {
      console.log(c.yellow("warn:") + ` cited proof \`${p}\` not found on disk`);
    }
  }
  return 0;
}

function decisionList() {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const rows = [];
  for (const f of walk(adrDir)) {
    const m = path.basename(f).match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(f);
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    const listedStatus = getHeader(text, "Status");
    const dateMatch = text.match(/^-\s+\*\*Date:\*\*\s+(\S+)/m);
    rows.push({
      id: m[1],
      status: listedStatus ?? "?",
      date: dateMatch ? dateMatch[1] : "—",
      title: titleMatch ? titleMatch[1].trim() : path.basename(f),
    });
  }
  if (rows.length === 0) {
    console.log(c.gray("no ADRs found in .doctrina/decisions/"));
    return 0;
  }
  console.log(c.bold("Decisions:"));
  console.log("");
  for (const r of rows) {
    console.log(`  ${c.cyan(r.id)}  ${r.status.padEnd(20)} ${r.date}  ${r.title}`);
  }
  console.log("");
  console.log(c.gray(`${rows.length} ADR${rows.length === 1 ? "" : "s"}`));
  return 0;
}

// Propose — or, with --write, apply — the capability scope of an ADR.
//
// An unscoped ADR is GLOBAL: it loads into every context pack, forever,
// because ADRs are immutable and never retire. That is what makes the
// default read pack grow with the project's age instead of with the task
// at hand. Scoping is the fix, but only if it gets adopted, and nobody
// hand-annotates forty immutable documents.
//
// So the scope is SUGGESTED from evidence the tree already holds: the
// archived change that introduced an ADR records which specs it touched
// (`changes_archive[].specs_affected`), and the ADR's own text names the
// capabilities it governs. Both are hints. The agent or human confirms —
// the tool proposes, it never decides (ADR 0005).
function decisionScope(args, cmdFlags) {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const doWrite = flagBool(cmdFlags, "write", false);

  const index = idx.load(projectRoot);
  const capabilities = new Set((index.artifacts.specs ?? []).map((s) => s.id));
  const archive = index.artifacts.changes_archive ?? [];
  const wanted = args[0] ? padNumber(parseInt(args[0], 10)) : null;

  const rows = [];
  for (const dec of index.artifacts.decisions ?? []) {
    if (wanted && dec.id !== wanted) continue;
    const file = path.join(projectRoot, dec.path);
    if (!exists(file)) continue;
    const text = read(file);
    const declared = parseAdrScope(text);

    // Signal 1 — the archived change that cites this ADR, and the specs
    // that change touched. Strongest evidence: it is what actually moved.
    const fromLedger = new Set();
    for (const ch of archive) {
      if (!archivedChangeCites(projectRoot, ch, dec.id)) continue;
      for (const s of ch.specs_affected ?? []) {
        if (capabilities.has(s.capability)) fromLedger.add(s.capability);
      }
    }
    // Signal 2 — capability ids the ADR's own text names, and only as a
    // FALLBACK. Capability ids are ordinary words (`cli`, `core`, `docs`),
    // so on a mature tree this signal matches nearly every ADR and a scope
    // of "everything" is the same as no scope at all. The ledger records
    // what actually moved; text only guesses. When the ledger has an
    // answer, it is the answer.
    const fromText = new Set();
    if (fromLedger.size === 0) {
      for (const cap of capabilities) {
        const escaped = cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, "im").test(text)) {
          fromText.add(cap);
        }
      }
    }
    const viaLedger = fromLedger.size > 0;
    const suggested = [...(viaLedger ? fromLedger : fromText)].sort();
    rows.push({ dec, file, text, declared, suggested, viaLedger });
  }

  if (rows.length === 0) {
    console.log(c.gray(wanted ? `no ADR ${wanted}` : "no ADRs found in .doctrina/decisions/"));
    return 0;
  }

  console.log(c.bold("ADR scope") + c.gray(" — an unscoped ADR is global: it loads into every pack"));
  console.log("");
  let wrote = 0;
  for (const r of rows) {
    const have = r.declared.length > 0
      ? c.green(r.declared.join(", "))
      : c.gray("(global)");
    console.log(`  ${c.cyan(r.dec.id)}  ${String(r.dec.title ?? "").slice(0, 48).padEnd(48)} ${have}`);
    if (r.declared.length > 0 || r.suggested.length === 0) continue;
    const via = r.viaLedger ? "ledger" : "text — confirm before writing";
    console.log(`        ${c.yellow("suggest:")} ${r.suggested.join(", ")} ${c.gray(`(${via})`)}`);
    if (!doWrite) continue;
    const updated = insertScopeHeader(r.text, r.suggested);
    if (updated) {
      write(r.file, updated, { force: true });
      wrote += 1;
      console.log(`        ${c.green("written")}`);
    }
  }

  console.log("");
  if (wrote > 0) {
    console.log(c.green("ok") + ` scoped ${wrote} ADR${wrote === 1 ? "" : "s"}`);
    console.log(c.gray("next: ") + c.cyan("doctrina index rebuild") + c.gray(" then review — a scope too narrow"));
    console.log(c.gray("      hides a decision from the pack that needs it."));
    return 0;
  }
  const open = rows.filter((r) => r.declared.length === 0);
  const actionable = open.filter((r) => r.suggested.length > 0).length;
  console.log(c.gray(`${open.length} of ${rows.length} unscoped (global)`)
    + (actionable > 0 ? c.gray(`, ${actionable} with a suggestion`) : ""));
  if (!doWrite && actionable > 0) {
    console.log(c.gray("apply: ") + c.cyan("doctrina decision scope --write"));
  }
  return 0;
}

// Does an archived change cite this ADR anywhere in its folder?
function archivedChangeCites(projectRoot, archived, adrId) {
  if (!archived.path) return false;
  const dir = path.join(projectRoot, archived.path);
  for (const f of walk(dir)) {
    if (f.endsWith(".md") && read(f).includes(`ADR ${adrId}`)) return true;
  }
  return false;
}

// Place `- **Scope:** a, b` in the metadata block, right after Status —
// where a reader looks for what a decision applies to.
function insertScopeHeader(text, scope) {
  if (getHeader(text, "Scope") !== null) return null;
  const line = `- **Scope:** ${scope.join(", ")}`;
  const updated = text.replace(/^(-[ \t]+\*\*Status:\*\*.*)$/m, `$1\n${line}`);
  return updated === text ? null : updated;
}

function nextDecisionNumber(projectRoot) {
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const files = walk(adrDir);
  let max = 0;
  for (const f of files) {
    const m = path.basename(f).match(/^(\d{4})-/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return padNumber(max + 1);
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
}

export const help = `
Usage: doctrina decision <subcommand> [args]

Subcommands:
  new "<title>"                        Create the next sequentially numbered ADR
  accept <number>                      Flip a proposed ADR to accepted (rewrites
                                       only the Status: header) and update the index
  land <number> [path ...]             Stamp an accepted ADR as implemented:
                                       rewrites only the Landed: header with today's
                                       date plus any cited proof paths. The decision
                                       body stays immutable. Satisfies the accepted-
                                       ADR evidence check without a supersede.
  supersede <number> "<new title>"     Create a new ADR that supersedes the target
                                       and rewrite the target's Status: header
  list                                 One line per ADR: number, status, date,
                                       title. Read-only.
  scope [<number>] [--write]           Show which capabilities each ADR governs
                                       and propose one for the unscoped, from the
                                       archived change that cites it. An unscoped
                                       ADR is global: it loads into every context
                                       pack. --write applies the suggestions.

Options:
  --write                              scope: apply the suggested scopes
  --json                               Machine-readable output
`;
