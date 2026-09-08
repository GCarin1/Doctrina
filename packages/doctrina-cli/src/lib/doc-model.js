// @ts-check
// The one owner of the on-disk artifact grammar (audit item M3).
//
// `.doctrina/` is Doctrina's public API, and its specification had ten
// homes. The ADR `Status:` grammar existed as ten regex literals across
// three files, and they were NOT equivalent — some captured, one only
// tested, two were anchored to end-of-line and so silently failed on a
// trailing space. Section extraction was reimplemented six times under six
// names: `extractSection` (twice), `sectionOf`, `sectionParagraph`,
// `productSection`, and the sections map in `spec-ops`.
//
// This violates the framework's own design principle #1 — "single
// ownership of every fact; no information has two homes."
//
// The contract here:
//
//   LENIENT ON READ.  `- **Status**: x` and `**Status:** x` both parse, and
//     a non-canonical form is REPORTED (so `validate --fix` can repair it)
//     rather than silently accepted or silently missed.
//   STRICT ON WRITE.  One canonical form per artifact kind, always.
import path from "node:path";
import { read } from "./fs-ops.js";
import { locateTemplatesDir } from "./templates.js";

// Artifact kinds and the header form each one canonically uses. Specs and
// contracts use bare bold; ADRs, proposals, and the intake use list items.
// Getting this backwards was a documented, recurring authoring mistake, so
// the CLI now decides it rather than the author remembering.
export const HEADER_STYLE = Object.freeze({
  BARE: "bare",   // **Status:** active
  LIST: "list",   // - **Status:** accepted
});

export const ARTIFACT_KIND = Object.freeze({
  SPEC: "spec",
  CONTRACT: "contract",
  DECISION: "decision",
  PROPOSAL: "proposal",
  INTAKE: "intake",
  PRODUCT: "product",
  UNKNOWN: "unknown",
});

const STYLE_BY_KIND = {
  [ARTIFACT_KIND.SPEC]: HEADER_STYLE.BARE,
  [ARTIFACT_KIND.CONTRACT]: HEADER_STYLE.BARE,
  [ARTIFACT_KIND.PRODUCT]: HEADER_STYLE.BARE,
  [ARTIFACT_KIND.DECISION]: HEADER_STYLE.LIST,
  [ARTIFACT_KIND.PROPOSAL]: HEADER_STYLE.LIST,
  [ARTIFACT_KIND.INTAKE]: HEADER_STYLE.LIST,
  [ARTIFACT_KIND.UNKNOWN]: HEADER_STYLE.BARE,
};

export function canonicalStyle(kind) {
  return STYLE_BY_KIND[kind] ?? HEADER_STYLE.BARE;
}

// Infer the artifact kind from its path. Deterministic; never reads content.
export function kindFromPath(relPathPosix) {
  const p = String(relPathPosix).replace(/\\/g, "/");
  if (/\/specs\/[^/]+\/spec\.md$/.test(p)) return ARTIFACT_KIND.SPEC;
  if (/\/contracts\/[^/]+\.md$/.test(p)) return ARTIFACT_KIND.CONTRACT;
  if (/\/decisions\/\d{4}-.*\.md$/.test(p)) return ARTIFACT_KIND.DECISION;
  if (/\/changes\/.*\/proposal\.md$/.test(p)) return ARTIFACT_KIND.PROPOSAL;
  if (/\/intake\.md$/.test(p)) return ARTIFACT_KIND.INTAKE;
  if (/\/product\.md$/.test(p)) return ARTIFACT_KIND.PRODUCT;
  return ARTIFACT_KIND.UNKNOWN;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// THE header grammar. One definition.
//
// Lenient by construction: the leading "- " is optional, the colon may sit
// inside or outside the bold span (`**Status:**` or `**Status**:`), and the
// value runs to end of line with surrounding space trimmed by the caller.
// Anchoring to `$` without allowing trailing whitespace is what made two of
// the old copies fail on files saved with a trailing space.
// A metadata header REQUIRES a colon, inside or outside the bold span.
// Without that, bold text used as a pseudo-heading in prose — the
// `**Positive**` / `**Negative**` / `**Neutral**` blocks every ADR carries —
// parses as a header and floods the conformance report.
function headerPattern(name) {
  const n = escapeRe(name);
  return new RegExp(`^([ \\t]*)(-[ \\t]+)?\\*\\*${n}[ \\t]*(?::\\*\\*|\\*\\*[ \\t]*:)[ \\t]*(.*?)[ \\t]*$`, "m");
}

// Read one header. Returns { value, style, conforming, line } or null.
/**
 * @returns {{ value: string, style: string, indent: string, raw: string,
 *             line: number, conforming: boolean } | null}
 */
export function readHeader(text, name) {
  const m = headerPattern(name).exec(String(text));
  if (!m) return null;
  const [raw, indent, dash, value] = m;
  const style = dash ? HEADER_STYLE.LIST : HEADER_STYLE.BARE;
  // Canonical is exactly `**Name:** value` (or `- **Name:** value`).
  const canonical = `${dash ? "- " : ""}**${name}:** ${value}`.replace(/\s+$/, "");
  return {
    value: value.trim(),
    style,
    indent,
    raw,
    line: text.slice(0, m.index).split("\n").length,
    conforming: raw.trim() === canonical.trim(),
  };
}

// The value only, or null. The replacement for specHeader/listHeader and
// every ad-hoc `match(/^-\s+\*\*Status:\*\*.../)`.
export function getHeader(text, name) {
  return readHeader(text, name)?.value ?? null;
}

// Write a header in the canonical form for `style`, preserving the style
// already present when the header exists. Returns the new text, or null
// when the header is absent — a set that silently does nothing is exactly
// the drift this prevents.
/**
 * @param {string} text
 * @param {string} name
 * @param {string} value
 * @param {{ style?: string }} [opts] Force a header style; defaults to the
 *   style already present, so a set never silently reformats the artifact.
 */
export function setHeader(text, name, value, opts = {}) {
  const { style } = opts;
  const existing = readHeader(text, name);
  if (!existing) return null;
  const useStyle = style ?? existing.style;
  const prefix = useStyle === HEADER_STYLE.LIST ? "- " : "";
  const replacement = `${existing.indent}${prefix}**${name}:** ${value}`.replace(/\s+$/, "");
  return String(text).replace(headerPattern(name), replacement);
}

// The PREAMBLE: everything before the first `## ` section. Metadata headers
// live there in every Doctrina artifact, and only there. Bold text ending in
// a colon further down is a prose lead-in ("**Standing constraints lived in
// agent memory:** ..."), not a header — scoping conformance to the preamble
// is what tells the two apart without guessing.
export function preamble(text) {
  const s = String(text);
  const m = /^##\s+/m.exec(s);
  return m ? s.slice(0, m.index) : s;
}

// Every header in the document's preamble, in order, with conformance
// recorded.
export function readAllHeaders(fullText) {
  const text = preamble(fullText);
  const out = [];
  const re = /^([ \t]*)(-[ \t]+)?\*\*([A-Za-z][A-Za-z .-]*?)[ \t]*(?::\*\*|\*\*[ \t]*:)[ \t]*(.*?)[ \t]*$/gm;
  let m;
  while ((m = re.exec(String(text)))) {
    const [raw, indent, dash, name, value] = m;
    const style = dash ? HEADER_STYLE.LIST : HEADER_STYLE.BARE;
    const canonical = `${indent}${dash ? "- " : ""}**${name}:** ${value}`.replace(/\s+$/, "");
    out.push({
      name, value: value.trim(), style, indent,
      line: String(text).slice(0, m.index).split("\n").length,
      conforming: raw.replace(/\s+$/, "") === canonical,
    });
  }
  return out;
}

// Headers whose written form is recognised but not canonical, optionally
// also flagging the wrong style for a known artifact kind. This is what
// `validate` reports and `validate --fix` repairs.
/** @param {string} text @param {string} [kind] */
export function nonConformingHeaders(text, kind = ARTIFACT_KIND.UNKNOWN) {
  const want = canonicalStyle(kind);
  const out = [];
  for (const h of readAllHeaders(text)) {
    const wrongStyle = kind !== ARTIFACT_KIND.UNKNOWN && h.style !== want;
    if (!h.conforming || wrongStyle) {
      out.push({ ...h, wrongStyle, expectedStyle: want });
    }
  }
  return out;
}

// Rewrite every recognised header into the canonical form for `kind`.
// Content is never touched — only the header's own punctuation and, when
// the kind is known, its style.
/** @param {string} text @param {string} [kind] */
export function repairHeaders(text, kind = ARTIFACT_KIND.UNKNOWN) {
  const want = canonicalStyle(kind);
  const lines = String(text).split("\n");
  // Repair only the PREAMBLE, and only lines that carry a colon — the same
  // two constraints reading uses. Without them this rewrote ADR prose:
  // `**Positive**` became `- **Positive:**`, and a bulleted definition list
  // `- **dropped intent** — ...` became `- **dropped intent:** — ...`.
  // A repair that edits prose is worse than the drift it fixes.
  const firstSection = lines.findIndex((l) => /^##\s+/.test(l));
  const limit = firstSection < 0 ? lines.length : firstSection;
  let repaired = 0;
  for (let i = 0; i < limit; i++) {
    // Match against the line without its carriage return. On a CRLF
    // checkout the trailing \r is not [ \t], so anchoring to $ silently
    // matched nothing and repair became a no-op on exactly the files most
    // likely to need it.
    const line = lines[i].replace(/\r$/, "");
    const eol = lines[i].endsWith("\r") ? "\r" : "";
    const m = /^([ \t]*)(-[ \t]+)?\*\*([A-Za-z][A-Za-z .-]*?)[ \t]*(?::\*\*|\*\*[ \t]*:)[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!m) continue;
    const [, indent, dash, name, value] = m;
    const style = kind === ARTIFACT_KIND.UNKNOWN ? (dash ? HEADER_STYLE.LIST : HEADER_STYLE.BARE) : want;
    const canonical = `${indent}${style === HEADER_STYLE.LIST ? "- " : ""}**${name}:** ${value}`.replace(/[ \t]+$/, "");
    if (line.replace(/[ \t]+$/, "") !== canonical) {
      // Preserve the file's existing line ending: repairing a header must
      // not rewrite every line of a CRLF file as a side effect.
      lines[i] = canonical + eol;
      repaired += 1;
    }
  }
  return { text: lines.join("\n"), repaired };
}

// ---------------------------------------------------------------- sections

// The body of a `## <name>` section: lines after the heading, up to the
// next heading of the same or higher level. Replaces six near-identical
// helpers that disagreed about level handling and trailing whitespace.
export function getSection(text, name, { level = 2 } = {}) {
  const lines = String(text).split(/\r?\n/);
  const head = new RegExp(`^#{${level}}\\s+${escapeRe(name)}\\b`, "i");
  const boundary = new RegExp(`^#{1,${level}}\\s+`);
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (inSection && boundary.test(line)) break;
    if (!inSection && head.test(line)) { inSection = true; continue; }
    if (inSection) out.push(line);
  }
  return inSection ? out.join("\n") : "";
}

export function hasSection(text, name, { level = 2 } = {}) {
  return new RegExp(`^#{${level}}\\s+${escapeRe(name)}\\b`, "im").test(String(text));
}

// The first non-empty, non-comment paragraph of a section — what `why` and
// `skill suggest` actually wanted when they each rolled their own.
export function getSectionParagraph(text, name, { level = 2 } = {}) {
  const body = getSection(text, name, { level });
  const para = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<!--")) continue;
    if (trimmed === "") {
      if (para.length > 0) break;
      continue;
    }
    para.push(trimmed);
  }
  return para.join(" ");
}

// Every `## ` heading in document order.
export function listSections(text, { level = 2 } = {}) {
  const re = new RegExp(`^#{${level}}\\s+(.+)$`, "gm");
  const out = [];
  let m;
  while ((m = re.exec(String(text)))) out.push(m[1].trim());
  return out;
}

// The document's H1 title, or null.
export function getTitle(text) {
  const m = /^#\s+(.+)$/m.exec(String(text));
  return m ? m[1].trim() : null;
}

// One parse of an artifact: title, headers, section names. The shape
// `parseArtifact` promises, so callers stop re-deriving it.
export function parseArtifact(text, { kind = ARTIFACT_KIND.UNKNOWN } = {}) {
  const headers = readAllHeaders(text);
  return {
    kind,
    title: getTitle(text),
    headers,
    headerMap: new Map(headers.map((h) => [h.name, h.value])),
    sections: listSections(text),
    nonConforming: nonConformingHeaders(text, kind),
  };
}

// ---------------------------------------------------------------------------
// The rest of the on-disk grammar (ADR 0021, change 0043)
// ---------------------------------------------------------------------------
//
// ADR 0021 declares ONE document model that owns how a Doctrina artifact is
// read off disk. Three parsers lived outside it — skill frontmatter in a
// command module, and the two delta parsers in another — and `lib/scan.js`
// imported them FROM `commands/`, inverting the dependency the layering
// depends on. Change 0037 broke that edge by moving them into lib/; this is
// the second half: they belong to the module the ADR names, not to two more
// libraries beside it.
//
// Pure text predicates, all of them. Nothing here reads a file.

export function parseFrontmatter(text, key) {
  // Match frontmatter blocks bounded by `---` lines at start of file.
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return null;
  const block = fmMatch[1];
  const lineRe = new RegExp(`^${key}\\s*:\\s*(.+)$`, "m");
  const m = block.match(lineRe);
  return m ? m[1].trim() : null;
}

export function parseOperation(text) {
  const m = text.match(/^\*\*Operation:\*\*\s*([A-Z]+)/m);
  if (!m) return null;
  const op = m[1];
  if (op === "ADDED" || op === "MODIFIED" || op === "REMOVED") return op;
  return null;
}

export function parseCapabilityFromDelta(text, deltaPath) {
  // Prefer the explicit header "# Spec Delta — capability: <name>"
  const m = text.match(/^#\s+Spec Delta\s*[—-]\s*capability:\s*([a-z][a-z0-9-]*)/m);
  if (m) return m[1];
  // Fall back to the parent directory name of the delta file
  const parent = path.basename(path.dirname(deltaPath));
  if (/^[a-z][a-z0-9-]*$/.test(parent)) return parent;
  return null;
}

/**
 * The value a shipped template writes for `name`, or null when the template
 * cannot be located (an unusual install) or does not carry that header.
 *
 * @param {string} templateName  e.g. "spec.md.template"
 * @param {string} name
 * @returns {string|null}
 */
export function templateHeaderValue(templateName, name) {
  try {
    return getHeader(read(path.join(locateTemplatesDir(), templateName)), name);
  } catch {
    return null;
  }
}

/**
 * Is this header value still the scaffold's placeholder?
 *
 * A check written to catch a MISSING header is dead in the normal flow when
 * the scaffold writes a value for it: the escape hatch arrives pre-armed
 * (change 0057). The templates mark a placeholder by wrapping the whole
 * value in angle brackets, so that is the portable rule; when the templates
 * can be located, the template's own value settles it exactly.
 *
 * @param {string|null|undefined} value
 * @param {{ template?: string, name?: string }} [opts]
 * @returns {boolean}
 */
export function isPlaceholderHeaderValue(value, opts = {}) {
  if (value === null || value === undefined) return true;
  const v = String(value).trim();
  if (v === "") return true;
  // `<...>` wrapping the WHOLE value — the templates' placeholder convention.
  // A real value may still contain angle brackets ("n/a — <why>" does not,
  // but a prose value could), which is why the whole value must be wrapped.
  if (/^<[\s\S]*>$/.test(v)) return true;
  if (opts.template && opts.name) {
    const tpl = templateHeaderValue(opts.template, opts.name);
    if (tpl !== null && tpl.trim() === v) return true;
  }
  return false;
}

/**
 * Is this section still the shipped template's — empty, or nothing but the
 * template's own instructional comment and placeholder?
 *
 * The framework writes artifacts from templates and then trusts that someone
 * filled them in. Exactly one gate checked that (`analyze`, over a change
 * proposal); everything else took the mould for a decision (change 0065).
 * This is the same ruler `isPlaceholderHeaderValue` applies to a header,
 * applied to a section body: an HTML comment is annotation (change 0055), so
 * a section that is only annotation is a section nobody wrote.
 *
 * @param {string} text          the whole artifact
 * @param {string} name          the `## ` section name
 * @param {{ template?: string }} [opts]  template file to compare against
 * @returns {boolean}
 */
export function isUnwrittenSection(text, name, opts = {}) {
  const body = getSection(text, name);
  if (body === null) return true;
  const prose = maskComments(body).trim();
  if (prose === "") return true;
  // A body that is nothing but the template's placeholder bullets or an
  // angle-bracket placeholder is unwritten too.
  const stripped = prose.replace(/^[-*]\s*$/gm, "").trim();
  if (stripped === "") return true;
  if (/^<[\s\S]*>$/.test(stripped)) return true;
  if (opts.template) {
    try {
      const tpl = read(path.join(locateTemplatesDir(), opts.template));
      const tplBody = getSection(tpl, name);
      if (tplBody !== null && maskComments(tplBody).trim() === prose) return true;
    } catch {
      // No templates dir — the checks above already carry the common cases.
    }
  }
  return false;
}

/**
 * The named sections of `text` that nobody has written yet, in order.
 *
 * @param {string} text
 * @param {string[]} names
 * @param {{ template?: string }} [opts]
 * @returns {string[]}
 */
export function unwrittenSections(text, names, opts = {}) {
  return names.filter((name) => isUnwrittenSection(text, name, opts));
}

// Is the on-disk spec still the untouched `spec new <cap>` scaffold? Precise
// check: render the shipped capability template for the same capability and
// compare, ignoring the date-bearing "Last updated" line and whitespace
// normalisation. When the template cannot be located (unusual installs),
// fall back to the scaffold's own placeholder fingerprints — text no real
// spec keeps. Used by `change apply` so an ADDED delta can replace a
// scaffold (the canonical spec-new → delta flow) without ever clobbering a
// spec that carries real content.
export function isUntouchedScaffold(specText, capability) {
  const normalize = (s) =>
    s.replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => !/^\*\*Last updated:\*\*/.test(line))
      .join("\n")
      .trim();
  try {
    const tplPath = path.join(locateTemplatesDir(), "spec.md.template");
    const rendered = read(tplPath)
      .replace(/\{\{CAPABILITY\}\}/g, capability)
      .replace(/\{\{DATE\}\}/g, "");
    if (normalize(rendered) === normalize(specText)) return true;
  } catch {
    // fall through to the fingerprint heuristic
  }
  // Fingerprints: the Purpose placeholder comment AND an empty Ubiquitous
  // section survive only in a scaffold nobody edited.
  return (
    specText.includes("<!-- One paragraph: what this capability does and why it exists. -->") &&
    /##\s+Requirements \(EARS\)[\s\S]*?### Ubiquitous\s*\n\s*-\s*\n/.test(specText)
  );
}


/**
 * The byte ranges every HTML comment occupies in `text`, in file order.
 *
 * A comment is annotation, not content: the scaffolded spec carries the
 * five-line EARS legend inside one, and the guessed delta (change 0044)
 * carries its `RANKED GUESS` note inside another. Every reader of an
 * on-disk artifact has to agree on that, so the ranges are computed HERE
 * and nowhere else (ADR 0021 — one owner for the on-disk grammar).
 *
 * @param {string} text
 * @returns {Array<[number, number]>}
 */
export function commentRanges(text) {
  /** @type {Array<[number, number]>} */
  const ranges = [];
  for (const m of text.matchAll(/<!--[\s\S]*?-->/g)) {
    ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  }
  return ranges;
}

/**
 * Is this offset inside one of `ranges`?
 *
 * @param {Array<[number, number]>} ranges
 * @param {number} offset
 * @returns {boolean}
 */
export function isInsideComment(ranges, offset) {
  return ranges.some(([a, b]) => offset >= a && offset < b);
}

/**
 * `text` with every HTML comment blanked out — same length, same line
 * count, same offset for every character that survives.
 *
 * This is the skip-by-position rule of `spec-ops.matchOpsBlock` in a form
 * a line- or regex-oriented scanner can use directly: a bullet inside a
 * comment stops looking like a bullet, and a command name inside one stops
 * looking like a reference, WITHOUT any surviving character moving. Masking
 * is for SCANNING only. Never write the masked text back to disk, and never
 * derive an authored value from it — a delta whose `append-criterion` value
 * legitimately contains `<!-- illustrative -->` must land with the marker
 * intact, which is why `applyOps` still works on the raw text.
 *
 * @param {string} text
 * @returns {string}
 */
export function maskComments(text) {
  let out = text;
  for (const [a, b] of commentRanges(text)) {
    const blanked = text.slice(a, b).replace(/[^\r\n]/g, " ");
    out = out.slice(0, a) + blanked + out.slice(b);
  }
  return out;
}

/**
 * The title a change proposal's H1 states, or null.
 *
 * The H1 the template writes is `# Change <id> — <title>`, and the id itself
 * contains hyphens (`NNNN-slug`) — which is what four separate copies of this
 * regex kept getting wrong in four slightly different ways. The one that read
 * `[^—-]*` for the id stopped at the FIRST hyphen, which in any multi-word id
 * is the id's own, so `prime`, `handoff` and `report` printed the slug glued
 * in front of the title on every change `work` had ever generated. The ones
 * that read `\s*[—-]\s*` accepted a bare hyphen with no spaces around it, so
 * an H1 with no separator at all had its last segment read as the title.
 *
 * The separator is a dash WITH whitespace on both sides; an id's hyphens
 * never have that, which is the whole ambiguity, resolved. Both the em dash
 * and the plain hyphen are accepted, because the character was never the
 * problem — a hand-written H1 using `-` reads exactly as clearly.
 *
 * The `Change <id> —` prefix is optional: an H1 written without it is a title
 * in its own right and is returned whole (ADR 0021 — one owner for the
 * on-disk grammar).
 *
 * @param {string} text  the proposal, or just its first line
 * @returns {string|null}
 */
export function parseChangeTitle(text) {
  const first = String(text ?? "").split(/\r?\n/).find((l) => /^#\s+\S/.test(l));
  if (!first) return null;
  const m = first.match(/^#\s+(?:Change\s+\S+\s+[—-]\s+)?(.+)$/);
  const title = m?.[1]?.trim();
  return title ? title : null;
}
