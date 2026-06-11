import path from "node:path";
import process from "node:process";
import { exists, isDir, read, relPath, walk } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

// Category-aware full-text search across the artifact tree. Answers
// "where is X specified / decided / proposed?" without knowing the
// layout. Plain substring matching, every term must hit (AND).

const MAX_MATCHES_PER_FILE = 5;

export async function run(positional, flags) {
  const terms = positional.map((t) => t.toLowerCase()).filter(Boolean);
  if (terms.length === 0) {
    console.error(c.red("error:") + " search requires at least one term");
    return 2;
  }
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
        const low = lines[i].toLowerCase();
        if (terms.every((t) => low.includes(t))) {
          hits.push({ line: i + 1, text: lines[i].trim() });
          if (hits.length === MAX_MATCHES_PER_FILE) break;
        }
      }
      if (hits.length > 0) findings.push({ rel, hits });
    }

    if (findings.length === 0) continue;
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

export const help = `
Usage: doctrina search <term> [<term> ...] [--archive]

Case-insensitive substring search across the artifact tree, grouped
by category (specs, decisions, changes, skills, product, AGENTS.md).
Every term must match on the same line. The change archive is
excluded unless --archive is passed.

Exits 0 when matches are found, 1 otherwise. Read-only.
`;
