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
//   ```
//
// A `# comment` or blank line inside the block is ignored. When a delta has
// no ops block, apply falls back to the manual-merge pointer (backward
// compatible).

const HEADER_RE = (name) =>
  new RegExp(`^(\\s*(?:-\\s+)?\\*\\*${escapeRe(name)}:\\*\\*)\\s*(.*)$`, "m");

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
function matchOpsBlock(text) {
  const m = text.match(/^[ \t]*```[ \t]*ops[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/m);
  return m ? m[1] : null;
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
    default:
      return { verb: null, error: `unknown operation "${verb}"` };
  }
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

// append-criterion <text> — add a new numbered criterion after the last one
// in the section.
export function appendCriterion(text, value) {
  const loc = locateCriteria(text);
  if (!loc) return { error: "append-criterion: spec has no '## Acceptance criteria' section" };
  if (loc.items.length === 0) {
    return { error: "append-criterion: no existing numbered criterion to append after" };
  }
  const last = loc.items[loc.items.length - 1];
  const nextN = Math.max(...loc.items.map((it) => it.n)) + 1;
  loc.lines.splice(last.lineIndex + 1, 0, `${last.indent}${nextN}. ${value}`);
  return { text: loc.lines.join("\n"), summary: `append-criterion ${nextN}` };
}
