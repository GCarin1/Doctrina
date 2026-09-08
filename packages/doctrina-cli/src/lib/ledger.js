// @ts-check
// The archive ledger, read as well as written.
//
// `.doctrina/changes/archive/LEDGER.md` is a structured log — date, change
// id, title, and the capabilities the change touched with the operation it
// performed on each — and for two releases exactly two things read it: an
// id set in `decision scope`, and a cross-check in `validate`. Everything
// else that wanted to know "what has been happening here" derived it from
// git, which knows about files and nothing about capabilities (audit
// findings F13, F14).
//
// The parse is DELIBERATELY tolerant. The file's own header invites humans
// to edit it and promises the CLI only appends, so a line that does not
// match the grammar is not a corrupt ledger — it is a person writing a note.
// Such lines are counted, never thrown, and never rewritten.
import path from "node:path";
import { appendFileSync } from "node:fs";
import { exists, isFile, mkdirp, read, write } from "./fs-ops.js";
import { today } from "./dates.js";

export const LEDGER_REL = ".doctrina/changes/archive/LEDGER.md";

const HEADER =
  "# Change ledger\n\n" +
  "One line per archived change, newest last. Appended by\n" +
  "`doctrina change archive`; edit freely, the CLI only appends.\n\n";

export function ledgerPath(projectRoot) {
  return path.join(projectRoot, ...LEDGER_REL.split("/"));
}

// One entry per recognised line. `kind` separates the three things the CLI
// records, because they mean different things to a reader: a change that
// LANDED, one that was discarded, and a gate that was waved through.
/**
 * @typedef {{
 *   date: string, id: string, kind: "archived"|"abandoned"|"gap",
 *   title: string, specs: {capability: string, operation: string}[],
 *   line: number, raw: string
 * }} LedgerEntry
 */

// `- YYYY-MM-DD — <id> — <rest>`, with either an em dash or a hyphen as the
// separator and any indentation (a gap line is indented). The date's month
// and day are range-checked: a bullet a person typed by hand is far more
// likely to be prose that happens to start with digits than an entry, and
// admitting it would put a fictional date into a churn window.
const LINE_RE = /^\s*-\s+(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\s+[—-]\s+(\S+)\s+[—-]\s+(.*)$/;
const SPECS_RE = /\(specs:\s*([^)]*)\)\s*$/;

/**
 * Parse ledger text into entries.
 *
 * @param {string} text
 * @returns {{entries: LedgerEntry[], unparsed: number}}
 */
export function parseLedger(text) {
  const entries = [];
  let unparsed = 0;
  const lines = String(text ?? "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    const m = raw.match(LINE_RE);
    if (!m) {
      // Prose, the file's own header, a hand-written note: not an entry, and
      // not an error either.
      if (/^\s*-\s/.test(raw)) unparsed += 1;
      continue;
    }
    const [, date, id, rest] = m;
    const trimmed = rest.trim();
    let kind = /** @type {"archived"|"abandoned"|"gap"} */ ("archived");
    if (/^abandoned\b/i.test(trimmed)) kind = "abandoned";
    else if (/^(?:forced|docs gap)\b/i.test(trimmed)) kind = "gap";

    const specsMatch = trimmed.match(SPECS_RE);
    const specs = specsMatch ? parseSpecs(specsMatch[1]) : [];
    const title = specsMatch ? trimmed.slice(0, specsMatch.index).trim() : trimmed;
    entries.push({ date, id, kind, title, specs, line: i + 1, raw });
  }
  return { entries, unparsed };
}

// "cli MODIFIED, gates MODIFIED" → [{capability, operation}]. An entry whose
// operation is missing keeps the capability: the capability is the fact the
// consumers need, and dropping the pair over a missing verb would lose it.
function parseSpecs(list) {
  const out = [];
  for (const part of list.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const m = t.match(/^([a-z][a-z0-9-]*)(?:\s+([A-Z]+))?$/);
    if (!m) continue;
    out.push({ capability: m[1], operation: m[2] ?? "" });
  }
  return out;
}

/**
 * Read and parse the project's ledger.
 *
 * @param {string} projectRoot
 * @returns {{path: string, exists: boolean, entries: LedgerEntry[], unparsed: number}}
 */
export function readLedger(projectRoot) {
  const p = ledgerPath(projectRoot);
  if (!isFile(p)) return { path: p, exists: false, entries: [], unparsed: 0 };
  const { entries, unparsed } = parseLedger(read(p));
  return { path: p, exists: true, entries, unparsed };
}

/**
 * How often each capability was touched, newest first by count.
 *
 * The number is reported, never judged: a spec that changes often may be
 * badly drawn or may simply be where the work is, and the CLI has no way to
 * tell those apart (ADR 0005). Only landed changes count — an abandoned
 * change touched nothing, and a forced-gap line records a waived gate rather
 * than a spec edit.
 *
 * @param {LedgerEntry[]} entries
 * @param {{since?: string|null}} [options] since — ISO date, inclusive
 * @returns {{capability: string, changes: number, last: string}[]}
 */
export function churnByCapability(entries, { since = null } = {}) {
  const seen = new Map();
  for (const e of entries) {
    if (e.kind !== "archived") continue;
    if (since && e.date < since) continue;
    for (const s of e.specs) {
      const row = seen.get(s.capability) ?? { capability: s.capability, changes: 0, last: "" };
      row.changes += 1;
      if (e.date > row.last) row.last = e.date;
      seen.set(s.capability, row);
    }
  }
  return [...seen.values()].sort((a, b) => b.changes - a.changes || a.capability.localeCompare(b.capability));
}

/**
 * Append one line, creating the ledger when this is its first entry.
 *
 * The three things that write the ledger — archive, abandon, and a forced
 * transition — used to carry their own copy of this header and their own
 * append, so the format the parser above reads had three authors. A forced
 * transition can happen before any change has ever been archived, and a gap
 * that goes unrecorded because the file did not exist yet is exactly the
 * silence the ledger exists to break.
 *
 * @param {string} projectRoot
 * @param {string} line  the entry, without the trailing newline
 */
export function appendLedgerLine(projectRoot, line) {
  const p = ledgerPath(projectRoot);
  if (!exists(p)) {
    mkdirp(path.dirname(p));
    write(p, HEADER);
  }
  appendFileSync(p, `${line}\n`);
  return p;
}

/** The canonical line for an archived change. */
export function archivedLine(id, title, specsAffected = [], date = today()) {
  const specs = specsAffected.length > 0
    ? ` (specs: ${specsAffected.map((s) => `${s.capability} ${s.operation}`).join(", ")})`
    : "";
  return `- ${date} — ${id} — ${title}${specs}`;
}

/** The canonical line for an abandoned change. */
export function abandonedLine(id, reason = "", date = today()) {
  return `- ${date} — ${id} — abandoned${reason ? ` — ${reason}` : ""}`;
}

/** The canonical line for a lifecycle gate that was waved through. */
export function forcedLine(id, transition, blockers, date = today()) {
  const summary = blockers.map((b) => `${b.gate}: ${b.message}`).join("; ");
  return `  - ${date} — ${id} — forced ${transition} past ${blockers.length} ` +
    `blocker${blockers.length === 1 ? "" : "s"} (${summary})`;
}

/**
 * The canonical line for a docs gap closed with --force.
 *
 * It follows the entry grammar rather than being free prose, because a
 * waived gate that no reader can find is the same as an unrecorded one.
 */
export function docsGapLine(id, signals, date = today()) {
  return `  - ${date} — ${id} — docs gap: closed with --force; ${signals.join("; ")} documented nowhere`;
}
