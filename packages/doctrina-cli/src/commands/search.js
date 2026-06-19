import path from "node:path";
import process from "node:process";
import { exists, isDir, read, relPath, walk } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

// Category-aware full-text search across the artifact tree. Answers
// "where is X specified / decided / proposed?" without knowing the
// layout. Plain substring matching, every term must hit (AND) on a line.
//
// Results are ranked, not dumped in file order: each hit is scored (a match
// in a heading or metadata header, or an adjacent full-phrase match, outranks
// a bare body line), files are scored by their hits plus a filename bonus, and
// files within a category print best-first. This mirrors the framework's own
// "ranked selection over dumping" thesis — at scale the agent reads the most
// relevant hit first instead of scanning an unordered list.

const MAX_MATCHES_PER_FILE = 5;

export async function run(positional, flags) {
  const terms = positional.map((t) => t.toLowerCase()).filter(Boolean);
  if (terms.length === 0) {
    console.error(c.red("error:") + " search requires at least one term");
    return 2;
  }
  const phrase = terms.join(" ");
  const includeArchive = flagBool(flags, "archive", false);
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  const categories = [
    { name: "specs", dir: path.join(".doctrina", "specs") },
    { name: "decisions", dir: path.join(".doctrina", "decisions") },
    { name: "changes", dir: path.join(".doctrina", "changes"), skip: (rel) => !includeArchive && rel.includes("/archive/") },
    { name: "skills", dir: path.join(".doctrina", "skills") },
    { name: "product", file: path.join(".doctrina", "product.md") },
    { name: "rules", file: "AGENTS.md" },
  ];

  let totalMatches = 0;
  let filesWithMatches = 0;

  for (const cat of categories) {
    const files = cat.file
      ? [path.join(projectRoot, cat.file)].filter(exists)
      : isDir(path.join(projectRoot, cat.dir))
        ? walk(path.join(projectRoot, cat.dir)).filter((f) => f.endsWith(".md"))
        : [];

    const findings = [];
    for (const f of files) {
      const rel = relPath(projectRoot, f);
      if (cat.skip && cat.skip(rel)) continue;
      const lines = read(f).split("\n");
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const low = raw.toLowerCase();
        if (terms.every((t) => low.includes(t))) {
          hits.push({ line: i + 1, text: raw.trim(), score: lineScore(raw, low, phrase) });
        }
      }
      if (hits.length === 0) continue;
      // Keep the highest-scoring lines (best-first), not merely the first few.
      hits.sort((a, b) => b.score - a.score || a.line - b.line);
      const fileScore = hits.reduce((s, h) => s + h.score, 0) + filenameBonus(rel, terms);
      findings.push({ rel, hits: hits.slice(0, MAX_MATCHES_PER_FILE), score: fileScore });
    }

    if (findings.length === 0) continue;
    // Most relevant file first; stable tie-break by path.
    findings.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));
    console.log(c.bold(cat.name));
    for (const file of findings) {
      filesWithMatches += 1;
      for (const h of file.hits) {
        totalMatches += 1;
        console.log(`  ${c.cyan(file.rel)}:${h.line}: ${truncate(h.text, 100)}`);
      }
    }
    console.log("");
  }

  if (totalMatches === 0) {
    console.log(c.gray(`no matches for "${positional.join(" ")}"${includeArchive ? "" : " (archive excluded; pass --archive to include it)"}`));
    return 1;
  }
  console.log(c.gray(`${totalMatches} match${totalMatches === 1 ? "" : "es"} in ${filesWithMatches} file${filesWithMatches === 1 ? "" : "s"}`));
  return 0;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Relevance of a single matching line. A heading or metadata-header line
// names the topic; an adjacent full-phrase match means the terms occur
// together, not scattered. Both outrank a bare body line.
function lineScore(raw, low, phrase) {
  let s = 1;
  if (/^\s*#{1,6}\s/.test(raw)) s += 2;
  if (/\*\*[^*]+:\*\*/.test(raw)) s += 1;
  if (phrase && low.includes(phrase)) s += 2;
  return s;
}

// A file whose name carries the query is almost always the right one;
// reward a full filename match more than a partial one.
function filenameBonus(rel, terms) {
  const base = rel.toLowerCase();
  if (terms.every((t) => base.includes(t))) return 3;
  return terms.some((t) => base.includes(t)) ? 1 : 0;
}

export const help = `
Usage: doctrina search <term> [<term> ...] [--archive]

Case-insensitive substring search across the artifact tree, grouped
by category (specs, decisions, changes, skills, product, AGENTS.md).
Every term must match on the same line. Within each category, files are
ranked best-first (heading / metadata / full-phrase / filename matches
score higher), and the highest-scoring lines per file are shown. The
change archive is excluded unless --archive is passed.

Exits 0 when matches are found, 1 otherwise. Read-only.
`;
