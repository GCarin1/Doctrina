import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, walk } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

const RULES = [
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
    re: /\b(many|few|some|several)\b(?!\s+\d)/gi,
    hint: "quantify (use a number or a precise scope)",
  },
  {
    name: "placeholder",
    re: /\b(TBD|TODO|FIXME|XXX|\?\?\?)\b/g,
    hint: "resolve before applying",
  },
];

export async function run(positional, flags) {
  const projectRoot = process.cwd();

  if (flagBool(flags, "all", false)) return clarifyAll(projectRoot);

  const target = positional[0];
  if (!target) {
    console.error(c.red("error:") + " clarify requires a path to a Markdown file (or --all)");
    return 2;
  }
  const fullPath = path.resolve(projectRoot, target);
  if (!isFile(fullPath)) {
    console.error(c.red("error:") + ` file not found: ${target}`);
    return 1;
  }

  console.log(`clarify ${relPath(projectRoot, fullPath)}`);
  console.log("");

  const smells = scanFile(fullPath);
  for (const s of smells) {
    console.log(`${c.yellow("⚠")} line ${s.line}: ${s.rule} "${s.token}" — ${s.hint}`);
  }

  console.log("");
  if (smells.length === 0) {
    console.log(c.green("ok") + " no smells found");
    return 0;
  }
  const word = smells.length === 1 ? "smell" : "smells";
  console.log(c.red("fail") + ` ${smells.length} ${word}`);
  return 1;
}

// Walk every living document — product, specs, open changes, skills —
// and clarify each. ADRs are immutable and the archive is history, so
// neither is included; AGENTS.md is dense command text, a different
// register from prose specs.
function clarifyAll(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
  const files = [];
  const productPath = path.join(projectRoot, ".doctrina", "product.md");
  if (isFile(productPath)) files.push(productPath);
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      const p = path.join(specsDir, cap, "spec.md");
      if (isFile(p)) files.push(p);
    }
  }
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    for (const id of readdirSync(changesDir).sort()) {
      if (id === "archive" || id.startsWith(".")) continue;
      if (!isDir(path.join(changesDir, id))) continue;
      files.push(...walk(path.join(changesDir, id)).filter((f) => f.endsWith(".md")));
    }
  }
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  files.push(...walk(skillsDir).filter((f) => f.endsWith(".md")));

  let total = 0;
  for (const f of files) {
    const smells = scanFile(f);
    if (smells.length === 0) continue;
    total += smells.length;
    const rel = relPath(projectRoot, f);
    for (const s of smells) {
      console.log(`${c.yellow("⚠")} ${rel}:${s.line}: ${s.rule} "${s.token}" — ${s.hint}`);
    }
  }

  console.log("");
  if (total === 0) {
    console.log(c.green("ok") + ` no smells in ${files.length} living document${files.length === 1 ? "" : "s"}`);
    return 0;
  }
  console.log(c.red("fail") + ` ${total} smell${total === 1 ? "" : "s"} across ${files.length} documents`);
  return 1;
}

function scanFile(fullPath) {
  const text = read(fullPath);
  const skippedRanges = collectSkippedRanges(text);
  const smells = [];

  // Per-line rules: regex pass with skip-range filter.
  const lines = text.split("\n");
  let cursor = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = cursor;
    const lineEnd = cursor + line.length;
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line))) {
        const absoluteStart = lineStart + m.index;
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

export const help = `
Usage: doctrina clarify <path>
       doctrina clarify --all

Read a Markdown file and report weasel words, vague quantifiers,
placeholders, and empty Acceptance criteria sections. Exits 0 when
no smells are found, 1 otherwise. Matches inside fenced code
blocks, HTML comments, and inline backtick spans are skipped.

With --all, every living document is scanned in one pass:
product.md, capability specs, open changes, and skills. ADRs
(immutable) and the archive (history) are excluded. CI-friendly.

Intended use: run before \`doctrina change apply\` or before
opening a PR. The command never modifies files.
`;
