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
export function setHeader(text, name, value, { style } = {}) {
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
