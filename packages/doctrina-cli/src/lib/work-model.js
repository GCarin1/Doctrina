// @ts-check
// Ranking capabilities against a set of changed files.
//
// `review` needs this to map a diff onto the specs it touches, and reached
// into `commands/work.js` for it (audit finding F7). A pure ranking over the
// spec tree, so it belongs in lib/.
import path from "node:path";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, mkdirp, read, relPath, write } from "./fs-ops.js";
// Rank capabilities by the working tree, not the prompt (review F10): a changed
// file scores its capability when the file sits under a path segment named for
// it, or when the spec cites the file as evidence. A deterministic overlap
// hint for the agent — never a decision (ADR 0005).
export function rankCapabilitiesByDiff(projectRoot, files, { limit = 3 } = {}) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (!files || files.length === 0 || !isDir(specsDir)) return [];
  const norm = files.map((f) => f.replace(/\\/g, "/"));

  const ranked = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const specText = read(specPath);
    let score = 0;
    for (const f of norm) {
      if (f.split("/").includes(cap)) score += 3;            // src/<cap>/... etc.
      if (specText.includes(f)) score += 5;                  // file cited in the spec
      else if (specText.includes(path.basename(f))) score += 2; // filename cited
    }
    if (score > 0) ranked.push({ id: cap, score, path: `.doctrina/specs/${cap}/spec.md` });
  }
  // `limit` keeps the work-playbook hint short (top 3); review passes
  // Infinity — truncating there is how it missed 5 of 8 touched capabilities
  // in the 0.11.0 field session.
  return ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
