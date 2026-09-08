// @ts-check
// Ranking capabilities — by a set of changed files, or by a prompt.
//
// `review` needs the diff ranker to map a diff onto the specs it touches, and
// reached into `commands/work.js` for it (audit finding F7). Both rankers are
// pure functions over the spec tree, and `work` now ACTS on the prompt one
// (it scaffolds the winner's delta), so neither belongs in a command module:
// ADR 0025 — command modules render, shared logic lives in lib/.
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { score, terms } from "./lexicon.js";
import { parseSourceGlobs } from "./scan.js";
import { globToRegExp } from "./runtime.js";
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
    // A DECLARED glob outranks every inference: the spec said this code is
    // its own, and a declaration is not a guess (change 0077).
    const declared = parseSourceGlobs(specText).map((g) => globToRegExp(g));
    let score = 0;
    for (const f of norm) {
      if (declared.some((re) => re.test(f))) score += 10;     // the spec claims it
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

// Deterministic term overlap: fold prompt and spec text with the SHARED
// lexicon, then score. This is a hint for the agent, never a decision
// (ADR 0005).
//
// Before change 0040 this carried its own stop list and its own fold, while
// `context --for` carried different ones — and the work playbook tells the
// agent to run `context` immediately after `work`. Two rankers, in sequence,
// on the same prompt, free to disagree about which capability it is about.
// Both now read lib/lexicon.js, and the score below is that module's
// PROJECTION of the relevance tuple, not a second calculation.
export function rankCapabilities(projectRoot, prompt) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const queryTerms = terms(prompt);
  if (queryTerms.length === 0 || !isDir(specsDir)) return [];

  const ranked = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    // The capability name is the emphasis: a term in the name says far more
    // about what the prompt is about than the same term buried in the body.
    const points = score(read(specPath), queryTerms, cap.split("-").join(" "));
    if (points > 0) ranked.push({ id: cap, score: points, path: `.doctrina/specs/${cap}/spec.md` });
  }
  const sorted = ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // The margin over the NEXT capability — computed before the top-3 cut, so
  // the winner's margin is a real one — is what lets a caller tell a lead
  // apart from a coin toss (change 0044). The last capability's runner-up is
  // 0, the same convention `triage` uses for a lane nothing scored against.
  return sorted.slice(0, 3).map((e, i) => ({ ...e, margin: e.score - (sorted[i + 1]?.score ?? 0) }));
}
