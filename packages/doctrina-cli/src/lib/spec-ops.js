// @ts-check
import { commentRanges, isInsideComment } from "./doc-model.js";
// Structured spec operations (ADR 0007 / review F3). A MODIFIED spec delta
// historically carried prose ("flip criterion 2 to verified", "bump to
// 0.3.0") that a human merged by hand — the single most error-prone step in
// the change flow, and the source of index/version drift. These functions
// turn that prose into a small, declarative, mechanically applicable
// operation set so `change apply` can edit the spec and regenerate the index
// in one transaction. The verbs are deliberately narrow: they touch headers
// and acceptance-criteria markers, never arbitrary spec prose — semantic
// rewriting stays the agent's job (ADR 0005); only the bookkeeping is
// automated.
//
// Delta format — an optional fenced block inside a MODIFIED delta body:
//
//   ```ops
//   set-header Implementation: verified — durable adapter (`src/db.ts`)
//   bump-version minor
//   set-criterion 1: verified
//   replace-criterion 2: [verified] new text — verified by `test/x.test.ts`
//   append-criterion [unverified] new signal — verified by `test/y.test.ts`
//   append-requirement event: When X occurs, the system shall do Y.
//   replace-requirement ubiquitous 2: The system shall do Z.
//   ```
//
// The requirement verbs (operator review 2026-07-19 §4.1) cover the dominant
// MODIFIED case — inserting or rewording EARS bullets in a `## Requirements
// (EARS)` subsection — so a typical delta no longer falls back to a manual
// merge. Because append-* verbs resolve their position/number at APPLY time,
// concurrent open changes appending to the same spec cannot collide on
// numbering: order of application decides, mechanically.
//
// A `# comment` or blank line inside the block is ignored. When a delta has
// no ops block, apply falls back to the manual-merge pointer (backward
// compatible).

// The read grammar is the document model's (M3); this local pattern exists
// only because the ops verbs REWRITE headers in place and need the prefix
// captured to preserve it.
const HEADER_RE = (name) =>
  new RegExp(`^(\\s*(?:-\\s+)?\\*\\*${escapeRe(name)}:\\*\\*)\\s*(.*)$`, "m");

// The ENUMS behind the two machine-read headers and the criterion mark
// (change 0102). `--version` and `--bump` always validated their input;
// `--status`, `--implementation` and `--criterion` wrote whatever string they
// were given, synced it into the index, and `validate` passed it — so a spec
// could say `Status: bogus` and `prime` would report "1 banana" without
// finding anything odd. A header every gate branches on has a domain, and
// this is it. A note after the state word stays legal ("planned — deferred,
// see ADR 0007"): only the WORD is checked.
export const STATUS_VALUES = ["draft", "active", "deprecated"];
export const IMPLEMENTATION_VALUES = ["planned", "partial", "implemented", "verified"];
export const CRITERION_MARKS = ["verified", "unverified", "orchestration"];

/** The state word of a header/mark value: the first token, note stripped. */
export function stateWord(value) {
  const first = String(value ?? "").trim().split(/\s+/)[0] ?? "";
  return first.replace(/[—:-]+$/, "").toLowerCase();
}

/** null when `value` is a legal value for `name`; otherwise the error text. */
export function headerValueError(name, value) {
  const allowed = name === "Status" ? STATUS_VALUES : name === "Implementation" ? IMPLEMENTATION_VALUES : null;
  if (!allowed) return null;
  const word = stateWord(value);
  if (allowed.includes(word)) return null;
  return `${name} must be one of ${allowed.join("|")} (got "${String(value).trim()}") — a note may follow the value, the value itself does not change`;
}

/** null when `mark` is a legal criterion mark; otherwise the error text. */
export function criterionMarkError(mark) {
  const word = stateWord(mark);
  if (CRITERION_MARKS.includes(word)) return null;
  return `a criterion mark must be one of ${CRITERION_MARKS.join("|")} (got "${String(mark).trim()}")`;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pull the operations out of a delta body. Returns an array of parsed ops
// (or an empty array when there is no `ops` block). Parsing is line-based and
// tolerant of CRLF.
export function extractOps(deltaText) {
  const block = matchOpsBlock(deltaText);
  if (block === null) return [];
  const ops = [];
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("<!--")) continue;
    const op = parseOpLine(line);
    ops.push(op); // includes { verb: null, error } for unknown lines
  }
  return ops;
}

// Find the body of the first ```ops fenced block, or null if absent. The
// info string must be exactly "ops" (case-insensitive) so a normal code
// fence in the prose is never mistaken for operations.
//
// A fence sitting INSIDE an HTML comment is skipped: the scaffolded delta
// template carries an EXAMPLE ops block in its instructional comment, and
// executing an example against a real spec is exactly the surprise this
// guard removes. The comment is skipped by POSITION, never by deleting the
// comment text first — stripping mutated ops values that legitimately
// contain a comment (an `<!-- illustrative -->` marker inside an
// append-criterion landed in the spec with the marker silently gutted).
function matchOpsBlock(text) {
  const ranges = commentRanges(text);
  const insideComment = (offset) => isInsideComment(ranges, offset);

  const fenceRe = /^[ \t]*```[ \t]*ops[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;
  let m;
  while ((m = fenceRe.exec(text))) {
    if (!insideComment(m.index)) return m[1];
  }
  return null;
}

function parseOpLine(line) {
  // `<verb> <rest>` — the verb is the first whitespace-delimited token.
  const sp = line.indexOf(" ");
  const verb = (sp < 0 ? line : line.slice(0, sp)).toLowerCase();
  const rest = sp < 0 ? "" : line.slice(sp + 1).trim();

  switch (verb) {
    case "set-header": {
      // set-header <Name>: <value>
      const colon = rest.indexOf(":");
      if (colon < 0) return { verb, error: `set-header needs "<Name>: <value>" (got "${rest}")` };
      const name = rest.slice(0, colon).trim();
      const value = rest.slice(colon + 1).trim();
      if (!name) return { verb, error: "set-header is missing the header name" };
      return { verb, name, value };
    }
    case "bump-version": {
      const level = rest.toLowerCase();
      if (!["major", "minor", "patch"].includes(level)) {
        return { verb, error: `bump-version needs major|minor|patch (got "${rest}")` };
      }
      return { verb, level };
    }
    case "set-criterion":
    case "replace-criterion": {
      // <verb> <n>: <value>
      const colon = rest.indexOf(":");
      if (colon < 0) return { verb, error: `${verb} needs "<n>: <value>" (got "${rest}")` };
      const n = Number(rest.slice(0, colon).trim());
      const value = rest.slice(colon + 1).trim();
      if (!Number.isInteger(n) || n < 1) return { verb, error: `${verb} needs a positive criterion number (got "${rest}")` };
      if (!value) return { verb, error: `${verb} ${n} is missing a value` };
      return { verb, n, value };
    }
    case "append-criterion": {
      if (!rest) return { verb, error: "append-criterion is missing its text" };
      return { verb, value: rest };
    }
    case "append-requirement": {
      // append-requirement <section>: <text>
      const colon = rest.indexOf(":");
      if (colon < 0) return { verb, error: `append-requirement needs "<section>: <text>" (got "${rest}")` };
      const section = normalizeSection(rest.slice(0, colon).trim());
      const value = rest.slice(colon + 1).trim();
      if (!section) return { verb, error: `append-requirement: unknown section "${rest.slice(0, colon).trim()}" (use ${SECTION_TOKENS})` };
      if (!value) return { verb, error: "append-requirement is missing the requirement text" };
      return { verb, section, value };
    }
    case "replace-requirement": {
      // replace-requirement <section> <n>: <text>
      const colon = rest.indexOf(":");
      if (colon < 0) return { verb, error: `replace-requirement needs "<section> <n>: <text>" (got "${rest}")` };
      const head = rest.slice(0, colon).trim().split(/\s+/);
      const value = rest.slice(colon + 1).trim();
      const n = Number(head[head.length - 1]);
      const section = normalizeSection(head.slice(0, -1).join(" "));
      if (!section) return { verb, error: `replace-requirement: unknown section "${head.slice(0, -1).join(" ")}" (use ${SECTION_TOKENS})` };
      if (!Number.isInteger(n) || n < 1) return { verb, error: `replace-requirement needs a positive bullet number (got "${rest}")` };
      if (!value) return { verb, error: `replace-requirement ${n} is missing the requirement text` };
      return { verb, section, n, value };
    }
    default:
      return { verb: null, error: `unknown operation "${verb}"` };
  }
}

// EARS subsection aliases -> the canonical token used to match the spec's
// `### ` heading under `## Requirements (EARS)`. Deterministic: first word of
// the heading, folded ("Unwanted-behavior (must-not)" -> "unwanted").
const SECTIONS = {
  ubiquitous: "ubiquitous",
  event: "event", "event-driven": "event",
  state: "state", "state-driven": "state",
  unwanted: "unwanted", "unwanted-behavior": "unwanted", "must-not": "unwanted",
  optional: "optional",
};
const SECTION_TOKENS = "ubiquitous|event|state|unwanted|optional";

function normalizeSection(raw) {
  return SECTIONS[raw.toLowerCase()] ?? null;
}

// Apply a parsed op list to a spec's Markdown text. Pure: returns
// { text, applied: string[], errors: string[] } and never throws. A failed
// op is recorded in `errors` and leaves the text unchanged for that op, so
// `change apply` can refuse to write a partially-mutated spec.
export function applyOps(specText, ops) {
  let text = specText;
  const applied = [];
  const errors = [];
  for (const op of ops) {
    if (op.error || !op.verb) {
      errors.push(op.error ?? "malformed operation");
      continue;
    }
    const res = applyOne(text, op);
    if (res.error) errors.push(res.error);
    else {
      text = res.text;
      applied.push(res.summary);
    }
  }
  return { text, applied, errors };
}

function applyOne(text, op) {
  switch (op.verb) {
    case "set-header":
      return setHeader(text, op.name, op.value);
    case "bump-version":
      return bumpVersion(text, op.level);
    case "set-criterion":
      return setCriterionMark(text, op.n, op.value);
    case "replace-criterion":
      return replaceCriterion(text, op.n, op.value);
    case "append-criterion":
      return appendCriterion(text, op.value);
    case "append-requirement":
      return appendRequirement(text, op.section, op.value);
    case "replace-requirement":
      return replaceRequirement(text, op.section, op.n, op.value);
    default:
      return { error: `unknown operation "${op.verb}"` };
  }
}

// Replace the value of a `**Name:** ...` header line (dash-optional),
// preserving the original prefix. Errors when the header is absent — a
// set-header that silently does nothing is exactly the drift this prevents.
export function setHeader(text, name, value) {
  const re = HEADER_RE(name);
  if (!re.test(text)) {
    return { error: `set-header: no "**${name}:**" header in the spec to set` };
  }
  // The domain is the SPEC's (bare bold header). The list form
  // (`- **Status:** proposed`) is a proposal's or an ADR's, whose Status
  // has a lifecycle of its own (proposed -> applied, accepted, superseded).
  const listForm = /^\s*-/.test(text.match(re)?.[1] ?? "");
  const domain = listForm ? null : headerValueError(name, value);
  if (domain) return { error: `set-header: ${domain}` };
  const next = text.replace(re, (_m, prefix) => `${prefix} ${value}`.replace(/\s+$/, ""));
  return { text: next, summary: `set ${name}: ${value}` };
}

export function bumpVersion(text, level) {
  const re = HEADER_RE("Version");
  const m = text.match(re);
  if (!m) return { error: "bump-version: no **Version:** header in the spec" };
  const cur = (m[2] ?? "").trim();
  const parts = cur.split(".").map((x) => Number(x));
  if (parts.length !== 3 || parts.some((x) => !Number.isInteger(x))) {
    return { error: `bump-version: current version "${cur}" is not semver X.Y.Z` };
  }
  let [maj, min, pat] = parts;
  if (level === "major") { maj += 1; min = 0; pat = 0; }
  else if (level === "minor") { min += 1; pat = 0; }
  else { pat += 1; }
  const next = `${maj}.${min}.${pat}`;
  const out = text.replace(re, (_m, prefix) => `${prefix} ${next}`);
  return { text: out, summary: `bump-version ${level}: ${cur} -> ${next}` };
}

// The acceptance-criteria block: lines under "## Acceptance criteria" that
// begin with "<n>. ". Returns { start, end, items: [{ n, lineIndex, line }] }
// where lines is the full split array. Null when the section is absent.
function locateCriteria(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  let sectionStart = -1;
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) {
      if (inSection) { inSection = false; }
      if (/^##\s+Acceptance criteria\b/i.test(line)) { inSection = true; sectionStart = i; }
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (m) items.push({ n: Number(m[2]), lineIndex: i, indent: m[1] });
  }
  if (sectionStart < 0) return null;
  return { lines, items };
}

// set-criterion <n>: <mark> — replace the [mark] token on criterion n.
// Accepts "verified"/"[verified]"; if the criterion has no [..] token, one
// is inserted right after the "n. " prefix.
export function setCriterionMark(text, n, markRaw) {
  const loc = locateCriteria(text);
  if (!loc) return { error: "set-criterion: spec has no '## Acceptance criteria' section" };
  const item = loc.items.find((it) => it.n === n);
  if (!item) return { error: `set-criterion: no criterion #${n} found` };
  const mark = markRaw.replace(/^\[|\]$/g, "").trim();
  const domain = criterionMarkError(mark);
  if (domain) return { error: `set-criterion: ${domain}` };
  const line = loc.lines[item.lineIndex];
  let next;
  if (/\[[^\]]*\]/.test(line)) {
    next = line.replace(/\[[^\]]*\]/, `[${mark}]`);
  } else {
    next = line.replace(/^(\s*\d+\.\s+)/, `$1[${mark}] `);
  }
  loc.lines[item.lineIndex] = next;
  return { text: loc.lines.join("\n"), summary: `set-criterion ${n}: ${mark}` };
}

// replace-criterion <n>: <text> — replace the prose of criterion n (keeping
// its "n. " numbering).
export function replaceCriterion(text, n, value) {
  const loc = locateCriteria(text);
  if (!loc) return { error: "replace-criterion: spec has no '## Acceptance criteria' section" };
  const item = loc.items.find((it) => it.n === n);
  if (!item) return { error: `replace-criterion: no criterion #${n} found` };
  loc.lines[item.lineIndex] = `${item.indent}${n}. ${value}`;
  return { text: loc.lines.join("\n"), summary: `replace-criterion ${n}` };
}

// The `### <Section>` blocks under `## Requirements (EARS)`. Returns
// { lines, sections: { <token>: { headingIndex, endIndex, bullets: [lineIndex] } } }
// or null when the Requirements section is absent. A section's token is the
// first word of its heading, folded through SECTIONS ("Unwanted-behavior
// (must-not)" -> "unwanted"). endIndex is exclusive: the line index of the
// next heading (### or ##) after the section, or lines.length.
function locateRequirements(text) {
  const lines = text.split(/\r?\n/);
  let inRequirements = false;
  let current = null;
  const sections = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      if (current) { current.endIndex = i; current = null; }
      inRequirements = /^##\s+Requirements\b/i.test(line);
      continue;
    }
    if (!inRequirements) continue;
    const h = line.match(/^###\s+(\S+)/);
    if (h) {
      if (current) current.endIndex = i;
      const token = SECTIONS[h[1].toLowerCase().replace(/[^a-z-]/g, "")] ?? null;
      current = { headingIndex: i, endIndex: lines.length, bullets: [] };
      if (token) sections[token] = current;
      continue;
    }
    if (current && /^\s*-(\s|$)/.test(line)) current.bullets.push(i);
  }
  return Object.keys(sections).length > 0 || /^##\s+Requirements\b/im.test(text)
    ? { lines, sections }
    : null;
}

// A list item may wrap over indented continuation lines ("- When X,\n
// the system shall ..."). Inserting right after the item's FIRST line
// splits it from its continuation — the bug the 0.13.0 dogfood close
// caught on this very repo's cli spec. From the item's first line, the
// item ends after every following line that is indented content.
function endOfItem(lines, startIndex) {
  let i = startIndex;
  while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) i += 1;
  return i;
}

// The EARS subsections in the order the spec template lays them out. A
// created subsection goes where a reader expects it, not at the end.
const EARS_ORDER = ["ubiquitous", "event", "state", "unwanted", "optional"];
const EARS_HEADINGS = {
  ubiquitous: "### Ubiquitous",
  event: "### Event-driven",
  state: "### State-driven",
  unwanted: "### Unwanted-behavior (must-not)",
  optional: "### Optional",
};

// Create an absent `### <EARS>` subsection under `## Requirements (EARS)`,
// carrying its first requirement, in canonical order: after the last
// existing subsection that precedes it, or ahead of them all when none
// does. The requirement goes in with the heading rather than in a second
// pass, so the blank lines around the new block are exact.
function createEarsSubsection(loc, section, value) {
  const heading = EARS_HEADINGS[section];
  if (!heading) return { error: `append-requirement: unknown EARS subsection "${section}"` };
  const lines = [...loc.lines];

  let insertAt = null;
  const rank = EARS_ORDER.indexOf(section);
  for (const token of EARS_ORDER.slice(0, rank).reverse()) {
    const prior = loc.sections[token];
    if (prior) {
      // End of that subsection, trimmed back past the blank lines it trails.
      let end = Math.min(prior.endIndex, lines.length);
      while (end > prior.headingIndex + 1 && lines[end - 1].trim() === "") end -= 1;
      insertAt = end;
      break;
    }
  }
  if (insertAt === null) {
    // Nothing precedes it: place it ahead of whichever subsection currently
    // comes first, or directly under the Requirements heading.
    const first = EARS_ORDER.map((t) => loc.sections[t]).find(Boolean);
    if (first) {
      insertAt = first.headingIndex;
    } else {
      const reqIndex = lines.findIndex((l) => /^##\s+Requirements\b/i.test(l));
      if (reqIndex < 0) return { error: "append-requirement: spec has no '## Requirements (EARS)' section" };
      insertAt = reqIndex + 1;
    }
  }

  // Exactly one blank line on each side, borrowing whichever the
  // insertion point already provides rather than adding a second.
  const block = [heading, "", `- ${value}`];
  if (insertAt > 0 && lines[insertAt - 1].trim() !== "") block.unshift("");
  if (lines[insertAt] !== undefined && lines[insertAt].trim() !== "") block.push("");
  lines.splice(insertAt, 0, ...block);
  return { text: lines.join("\n") };
}

// append-requirement <section>: <text> — add "- <text>" at the end of the
// EARS subsection. A lone "-" placeholder bullet (the untouched scaffold) is
// replaced instead of appended after, so the first real requirement does not
// land under an empty stub.
export function appendRequirement(text, section, value) {
  let loc = locateRequirements(text);
  if (!loc) return { error: "append-requirement: spec has no '## Requirements (EARS)' section" };
  if (!loc.sections[section]) {
    // The subsection does not exist yet. Refusing here is a dead end: the
    // author cannot hand-edit the spec (AGENTS.md forbids editing specs
    // outside a delta) and no op creates a subsection, so a spec that was
    // split — losing the EARS headings it had no requirements for — could
    // never receive one again. Create it, in canonical EARS order.
    const created = createEarsSubsection(loc, section, value);
    if (created.error) return created;
    return {
      text: created.text,
      summary: `append-requirement ${section} (created subsection): ${value.slice(0, 44)}`,
    };
  }
  const sec = loc.sections[section];
  const placeholder = sec.bullets.length === 1 && /^\s*-\s*$/.test(loc.lines[sec.bullets[0]]);
  if (placeholder) {
    loc.lines[sec.bullets[0]] = `- ${value}`;
  } else if (sec.bullets.length > 0) {
    loc.lines.splice(endOfItem(loc.lines, sec.bullets[sec.bullets.length - 1]) + 1, 0, `- ${value}`);
  } else {
    // Empty section: insert after the heading (skipping one blank line if present).
    let at = sec.headingIndex + 1;
    while (at < sec.endIndex && loc.lines[at].trim() === "") at += 1;
    loc.lines.splice(at, 0, `- ${value}`);
  }
  return { text: loc.lines.join("\n"), summary: `append-requirement ${section}: ${value.slice(0, 60)}` };
}

// replace-requirement <section> <n>: <text> — replace the nth bullet (1-based)
// of the EARS subsection.
export function replaceRequirement(text, section, n, value) {
  const loc = locateRequirements(text);
  if (!loc) return { error: "replace-requirement: spec has no '## Requirements (EARS)' section" };
  const sec = loc.sections[section];
  if (!sec) return { error: `replace-requirement: no '### ${section}...' subsection found under Requirements` };
  const real = sec.bullets.filter((i) => !/^\s*-\s*$/.test(loc.lines[i]));
  if (n > real.length) {
    return { error: `replace-requirement: section "${section}" has ${real.length} requirement${real.length === 1 ? "" : "s"}, no #${n}` };
  }
  const indent = loc.lines[real[n - 1]].match(/^(\s*)/)[1];
  loc.lines[real[n - 1]] = `${indent}- ${value}`;
  return { text: loc.lines.join("\n"), summary: `replace-requirement ${section} ${n}` };
}

// append-criterion <text> — add a new numbered criterion after the last one
// in the section.
export function appendCriterion(text, value) {
  const loc = locateCriteria(text);
  if (!loc) return { error: "append-criterion: spec has no '## Acceptance criteria' section" };
  if (loc.items.length === 0) {
    return { error: "append-criterion: no existing numbered criterion to append after" };
  }
  const leadingMark = String(value).match(/^\s*\[([^\]]*)\]/);
  if (leadingMark) {
    const domain = criterionMarkError(leadingMark[1]);
    if (domain) return { error: `append-criterion: ${domain}` };
  }
  const last = loc.items[loc.items.length - 1];
  const nextN = Math.max(...loc.items.map((it) => it.n)) + 1;
  loc.lines.splice(endOfItem(loc.lines, last.lineIndex) + 1, 0, `${last.indent}${nextN}. ${value}`);
  return { text: loc.lines.join("\n"), summary: `append-criterion ${nextN}` };
}
