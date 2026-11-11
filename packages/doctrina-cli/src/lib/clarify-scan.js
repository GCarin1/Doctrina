// @ts-check
import process from "node:process";
import { read } from "./fs-ops.js";
import { detectLanguage } from "./lexicon.js";
import { loadConfig } from "./config.js";

// The clarify SCANNER (change 0232): the lexicons and the line scanner that
// `doctrina clarify` renders, in lib so a second caller can ask the same
// question. `change check` scans the spec a delta WILL write, before apply:
// a weasel word in a delta used to surface only after the close had merged
// it, when the repository's own living-documents check went red mid-close.

// Two lexicons, one linter (0.11.0 field review item 3: an English-only
// clarify is permanently red on a PT-BR project — "some" is the verb *sumir*,
// "TODO o pensamento" is the pronoun *todo* — which teaches people to ignore
// the gate). The language comes from `.doctrina/config.json` ("language":
// "pt-BR" | "en"), else a per-file stopword heuristic. Portuguese mode swaps
// the ambiguous EN tokens for a PT lexicon; TODO only counts with a colon
// ("TODO:") since bare TODO is the pronoun.
const RULES_EN = [
  {
    // "may" is intentionally NOT in this list: EARS Optional grammar
    // uses "the system may ..." legitimately, and a clarify pass that
    // flags every EARS Optional is unusable on Doctrina-style specs.
    // The remaining weasel terms are unambiguous.
    name: "weasel",
    re: /\b(might|could|should\s+probably|perhaps|maybe|approximately|roughly)\b/gi,
    hint: "state explicitly with a definite verb",
  },
  {
    name: "vague",
    // Two exclusions, both structural rather than a vocabulary loosening.
    // The lookahead was already here: `many 5` quantifies. The lookbehind is
    // change 0079: `how many` is INTERROGATIVE, and a requirement that says
    // "shall report how many contracts declared no rows" names exactly the
    // number the command must print — the opposite of vague. Five of this
    // repository's seventeen smells were that phrase, and the noise is what
    // hid the one real finding among them ("name some of them", which said
    // nothing about how many). A gate that cries wolf teaches people to
    // ignore it.
    //
    // The quality adjectives sit here for the same reason the quantifiers do:
    // "robust" names no threshold, so it cannot be met or missed. They were
    // in the Portuguese lexicon and nowhere in this one, so the SAME sentence
    // translated came back with three smells in one language and none in the
    // other — and this project keeps its own pages in both. A smell test that
    // answers differently per language is not testing the writing.
    re: /(?<!\bhow\s+)\b(many|few|some|several|adequate|robust|scalable)\b(?!\s+\d)/gi,
    hint: "quantify (use a number or a precise scope)",
  },
  {
    name: "placeholder",
    re: /\b(TBD|TODO|FIXME|XXX|\?\?\?)\b/g,
    hint: "resolve before applying",
  },
];

// How much of the previous line a rule may look back into. Long enough for
// a wrapped two-word phrase, short enough that the probe stays cheap.
const LOOKBEHIND_TAIL = 40;

const RULES_PT = [
  {
    name: "weasel",
    re: /\b(talvez|possivelmente|provavelmente|aproximadamente|quem sabe|eventualmente)\b/gi,
    hint: "afirme explicitamente, com um verbo definido",
  },
  {
    // ASCII-folded variants included so "varios"/"vários" both match.
    name: "vague",
    re: /\b(muitos|muitas|poucos|poucas|v[aá]rios|v[aá]rias|alguns|algumas|adequado|adequada|robusto|robusta|escal[aá]vel)\b(?!\s+\d)/gi,
    hint: "quantifique (um número ou um escopo preciso)",
  },
  {
    // Bare TODO is the Portuguese pronoun; only TODO: is a marker here.
    name: "placeholder",
    re: /\b(TBD|FIXME|XXX|\?\?\?)\b|\bTODO:/g,
    hint: "resolva antes de aplicar",
  },
];

// Language for a file: the project-declared `.doctrina/config.json`
// ("language": "pt-BR" / "pt" / "en") wins; otherwise a deterministic
// stopword count over the file text decides. Never semantic (ADR 0005).

function projectLanguage(projectRoot) {
  // One configuration reader (lib/config.js, change 0047): the key still
  // lives in .doctrina/config.json, but `doctor` can now show what it
  // resolved to, which is what a pt-BR project sitting red needed.
  return loadConfig(projectRoot).language;
}

// Which lexicon a document is written in — the shared detector (change
// 0040), so `clarify` and any future consumer count the same grammar words.
function detectLang(text) {
  return detectLanguage(text);
}

export function rulesFor(projectRoot, text, forcedLang = /** @type {string | null} */ (null)) {
  const lang = forcedLang ?? projectLanguage(projectRoot);
  if (lang) return lang === "pt" ? RULES_PT : RULES_EN;
  // Detected per file, the document is scanned with BOTH lexicons (change
  // 0107). A bilingual spec — Portuguese purpose, English EARS, or the
  // reverse — detected as one language hid every smell written in the
  // other: `clarify --all` found nothing where `--lang pt` found two. The
  // two vocabularies do not overlap, so a smell in either is a smell; the
  // detected language only decides which hint text the reader gets first.
  const detected = detectLang(text);
  const [first, second] = detected === "pt" ? [RULES_PT, RULES_EN] : [RULES_EN, RULES_PT];
  // The `placeholder` rule is language-neutral and lives in both lists:
  // one copy, or TBD is reported twice.
  return [...first, ...second.filter((r) => r.name !== "placeholder")];
}

/** The smells of a file on disk. */
export function scanFile(fullPath, projectRoot = process.cwd(), lang = /** @type {string | null} */ (null)) {
  return scanText(read(fullPath), projectRoot, lang);
}

/**
 * The smells `clarify` reports for a text, line by line.
 * @returns {Array<{ line: number, rule: string, token: string, hint: string }>}
 */
export function scanText(text, projectRoot = process.cwd(), lang = /** @type {string | null} */ (null)) {
  const skippedRanges = collectSkippedRanges(text);
  const rules = rulesFor(projectRoot, text, lang);
  const smells = [];

  // Per-line rules: regex pass with skip-range filter. A line carrying the
  // inline suppression marker `<!-- clarify:ok -->` is deliberately accepted
  // by the author — skip it entirely (the escape hatch for a false positive
  // the lexicon cannot know about; "block, never imprison").
  const lines = text.split("\n");
  let cursor = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = cursor;
    const lineEnd = cursor + line.length;
    if (line.includes("clarify:ok")) {
      cursor = lineEnd + 1;
      continue;
    }
    // A rule reads the previous line as CONTEXT, never as content: a match
    // is only reported when it starts inside this line. Prose wraps, and
    // "report per spec how / many criteria..." split the interrogative
    // across a line break — which a line-at-a-time scanner cannot see, so
    // the phrase came back as a smell on one line of the same document and
    // not on the next (change 0079). The prefix is trimmed to the tail of
    // the previous line: enough for a lookbehind, cheap on every line.
    const prev = i > 0 ? lines[i - 1].slice(-LOOKBEHIND_TAIL) : "";
    const probe = prev === "" ? line : `${prev}\n${line}`;
    const offset = probe.length - line.length;
    for (const rule of rules) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(probe))) {
        if (m.index < offset) continue;   // the match belongs to the previous line
        const absoluteStart = lineStart + m.index - offset;
        if (isInSkippedRange(absoluteStart, skippedRanges)) continue;
        smells.push({
          line: i + 1,
          rule: rule.name,
          token: m[0],
          hint: rule.hint,
        });
      }
    }
    cursor = lineEnd + 1; // +1 for the newline
  }

  // Section rule: empty Acceptance criteria.
  if (hasEmptyAcceptanceCriteria(text)) {
    smells.push({
      line: findAcceptanceLine(text),
      rule: "empty-section",
      token: "Acceptance criteria",
      hint: "fill in observable, verifiable signals",
    });
  }

  smells.sort((a, b) => a.line - b.line);
  return smells;
}

// Build ranges to skip: fenced code blocks, HTML comments, inline backticks.
function collectSkippedRanges(text) {
  const ranges = [];
  // Fenced code blocks (``` ... ```)
  for (const m of text.matchAll(/```[\s\S]*?```/g)) ranges.push([m.index, m.index + m[0].length]);
  // HTML comments (<!-- ... -->)
  for (const m of text.matchAll(/<!--[\s\S]*?-->/g)) ranges.push([m.index, m.index + m[0].length]);
  // Inline backtick spans (`...`)
  for (const m of text.matchAll(/`[^`\n]+`/g)) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}

function isInSkippedRange(offset, ranges) {
  for (const [a, b] of ranges) if (offset >= a && offset < b) return true;
  return false;
}

function hasEmptyAcceptanceCriteria(text) {
  const headingRe = /^##\s+Acceptance criteria\s*$/m;
  const m = headingRe.exec(text);
  if (!m) return false;
  const after = text.slice(m.index + m[0].length);
  // Find the body between this heading and the next heading of equal level.
  const nextHeadingMatch = after.match(/^##\s+/m);
  const body = nextHeadingMatch ? after.slice(0, nextHeadingMatch.index) : after;
  // Strip HTML comments before checking emptiness.
  const stripped = body.replace(/<!--[\s\S]*?-->/g, "").trim();
  return stripped.length === 0;
}

function findAcceptanceLine(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+Acceptance criteria\s*$/.test(lines[i])) return i + 1;
  }
  return 1;
}
