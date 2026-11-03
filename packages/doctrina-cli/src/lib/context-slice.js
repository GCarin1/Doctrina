// @ts-check
import { fold } from "./lexicon.js";
import { getSection } from "./doc-model.js";

// The lean read pack (change 0216).
//
// A field review: the agent ran `prime` and `work` and skipped `context`,
// although AGENTS.md calls it the read for ANY task. Measured on this
// repository, the reason is the price: `context gates --concat` was ~40k
// tokens — AGENTS.md again (the agent already carries it), the whole spec,
// and every accepted ADR in full — and `--for "<task>"` cut nothing, because
// retrieval only degraded the pack once the 50k budget overflowed. These
// cuts are the default now; `--full` restores the whole text.

// How much of an ADR's Decision a digest keeps.
const ADR_DIGEST_CHARS = 700;
// How many requirements and criteria a sliced spec keeps at most, each.
const SLICE_MAX_ITEMS = 25;

/**
 * An ADR as a reader deciding whether it binds the task needs it: the
 * title and the opening of its Decision section. `doctrina show NNNN`
 * reads the rest.
 *
 * @param {string} text
 * @param {string} title
 * @param {string} id   four-digit ADR number
 */
export function adrDigest(text, title, id) {
  const decision = (getSection(text.replace(/\r\n/g, "\n"), "Decision") ?? "")
    .split("\n").filter((l) => !l.trim().startsWith("<!--")).join("\n").trim();
  const clipped = decision.length > ADR_DIGEST_CHARS
    ? `${decision.slice(0, ADR_DIGEST_CHARS).replace(/\s+\S*$/, "")} …`
    : decision;
  return [`# ${title}`, "", clipped || "(no Decision section)", "",
    `(digest — full text: \`doctrina show ${id}\`, or \`context --full\`)`].join("\n");
}

/**
 * A spec cut to what the task is about: its headers, its Purpose, and the
 * requirements and criteria that match the query best — the rest named by
 * count, never silently dropped. Deterministic: an item's score is how many
 * distinct query terms it contains; the items scoring at least half the
 * best score are kept, best first in document order, up to a cap per list.
 *
 * @param {string} text
 * @param {string[]} queryTerms  already folded, stop words removed
 * @param {string} rel           the spec's path, for the footer
 * @returns {{ text: string, kept: number, total: number } | null}  null when nothing matched
 */
export function sliceSpec(text, queryTerms, rel) {
  if (queryTerms.length === 0) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  // Items: a bullet or numbered entry with its continuation lines.
  /** @type {Array<{ start: number, end: number, kind: "req"|"crit", score: number }>} */
  const items = [];
  let section = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s/.test(l)) { section = l; continue; }
    const req = /^##\s+Requirements/i.test(section) && /^\s*-\s+\S/.test(l);
    const crit = /^##\s+Acceptance criteria/i.test(section) && /^\s*\d+\.\s+\S/.test(l);
    if (!req && !crit) continue;
    let end = i;
    while (end + 1 < lines.length && /^\s+\S/.test(lines[end + 1]) && !/^\s*(-|\d+\.)\s/.test(lines[end + 1])) end += 1;
    const body = fold(lines.slice(i, end + 1).join(" "));
    const score = queryTerms.filter((t) => body.includes(t)).length;
    items.push({ start: i, end, kind: req ? "req" : "crit", score });
    i = end;
  }
  const best = Math.max(0, ...items.map((it) => it.score));
  if (best === 0) return null;
  const floor = Math.max(1, Math.ceil(best / 2));
  const keep = new Set();
  for (const kind of ["req", "crit"]) {
    items.filter((it) => it.kind === kind && it.score >= floor)
      .sort((a, b) => b.score - a.score || a.start - b.start)
      .slice(0, SLICE_MAX_ITEMS)
      .forEach((it) => keep.add(it.start));
  }

  const out = [];
  section = "";
  let omitted = 0;
  const flushOmitted = () => {
    if (omitted > 0) out.push(`  … ${omitted} not matching the task`);
    omitted = 0;
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s/.test(l)) {
      flushOmitted();
      section = l;
      out.push(l);
      continue;
    }
    const item = items.find((it) => it.start === i);
    if (item) {
      if (keep.has(i)) { flushOmitted(); out.push(...lines.slice(i, item.end + 1)); } else omitted += 1;
      i = item.end;
      continue;
    }
    // Headers, Purpose and subsection headings are kept; prose in the other
    // sections (Out of scope, Maturity, …) is the first thing a task can do
    // without.
    const inLists = /^##\s+(Requirements|Acceptance criteria)/i.test(section);
    const prose = section !== "" && !/^##\s+Purpose/i.test(section) && !inLists;
    if (/^###\s/.test(l)) { flushOmitted(); out.push(l); continue; }
    if (section === "" || /^##\s+Purpose/i.test(section)) { out.push(l); continue; }
    if (inLists && l.trim() !== "") continue;
    if (!prose) out.push(l);
  }
  flushOmitted();
  const kept = keep.size;
  out.push("", `(sliced for "${queryTerms.join(" ")}" — ${kept} of ${items.length} requirements and criteria kept; ` +
    `full text: ${rel}, or \`context --full\`)`);
  return { text: out.join("\n").replace(/\n{3,}/g, "\n\n"), kept, total: items.length };
}
