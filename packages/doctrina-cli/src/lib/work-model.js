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

  const specs = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const text = read(specPath);
    specs.push({ cap, text, declared: parseSourceGlobs(text).map((g) => globToRegExp(g)) });
  }

  // Per file, the strongest answer the tree holds wins, and a weaker one is
  // never added on top of it (change 0200, ADR 0027):
  //   1. the specs whose `**Source:**` claims the file — a declaration;
  //   2. else the specs citing the exact path (a proof or a pointer);
  //   3. else the path/basename inferences, and only from specs that declare
  //      NO Source — a spec that stated what it owns has said all it owns.
  // The old sum added every signal from every spec, so a file claimed by
  // `health` still "belonged" to `cloud` because cloud's spec mentioned an
  // `index.ts`, and every close warned about a spec the change never touched.
  const scores = new Map();
  const add = (cap, n) => scores.set(cap, (scores.get(cap) ?? 0) + n);
  for (const f of norm) {
    const claimed = specs.filter((s) => s.declared.some((re) => re.test(f)));
    if (claimed.length > 0) {
      for (const s of claimed) add(s.cap, 10);
      continue;
    }
    const citing = specs.filter((s) => s.text.includes(f));
    if (citing.length > 0) {
      for (const s of citing) add(s.cap, 5);
      continue;
    }
    for (const s of specs) {
      if (s.declared.length > 0) continue;
      if (f.split("/").includes(s.cap)) add(s.cap, 3);            // src/<cap>/... etc.
      if (s.text.includes(path.basename(f))) add(s.cap, 2);       // filename cited
    }
  }
  const ranked = [...scores].map(([id, score]) => ({ id, score, path: `.doctrina/specs/${id}/spec.md` }));
  // `limit` keeps the work-playbook hint short (top 3); review passes
  // Infinity — truncating there is how it missed 5 of 8 touched capabilities
  // in the 0.11.0 field session.
  return ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}

/**
 * The capabilities whose `Source:` header CLAIMS a file — ADR 0027's question
 * asked directly, with no inference in the answer.
 *
 * `rankCapabilitiesByDiff` deliberately falls back to inferences so a project
 * that has not declared anything still gets a hint. That makes it the wrong
 * function to enforce the declaration with: a file no spec names still comes
 * back with an owner, scored 5 instead of 10, and a test asking "does this
 * have an owner" cannot tell the two apart. `lib/names.js` sat undeclared
 * behind exactly that.
 */
export function declaredOwners(projectRoot, file) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (!isDir(specsDir)) return [];
  const norm = String(file).replace(/\\/g, "/");
  const owners = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const globs = parseSourceGlobs(read(specPath)).map((g) => globToRegExp(g));
    if (globs.some((re) => re.test(norm))) owners.push(cap);
  }
  return owners;
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

// How far back `work` looks for an archived change the prompt may repeat,
// and how much of one side the other must cover to count (change 0215).
export const SIMILAR_CHANGE_DAYS = 14;
// Three shared terms: two matched "mudar uma coisa" with "mudar outra coisa".
const SIMILAR_MIN_SHARED = 3;
const SIMILAR_MIN_COVER = 0.6;

/**
 * Open changes, and changes archived in the last SIMILAR_CHANGE_DAYS, whose
 * title and Why the prompt mostly repeats. A field review: two changes were
 * done and archived, and the next request — "create the doctrina work for
 * payment and admin" — would have opened the same work twice. Deterministic
 * term overlap (ADR 0005), measured from both sides: a short prompt that
 * names most of a change, or a change named mostly by a long prompt.
 *
 * @param {string} projectRoot
 * @param {string} prompt
 * @returns {Array<{ id: string, title: string, where: "open"|"archived", path: string, shared: string[] }>}
 */
export function similarChanges(projectRoot, prompt) {
  const asked = terms(prompt);
  if (asked.length === 0) return [];
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (!isDir(changesDir)) return [];
  const candidates = [];
  for (const name of readdirSync(changesDir).sort()) {
    if (name === "archive" || name.startsWith(".")) continue;
    const proposal = path.join(changesDir, name, "proposal.md");
    if (isFile(proposal)) candidates.push({ id: name, where: /** @type {"open"|"archived"} */ ("open"), rel: `.doctrina/changes/${name}/`, text: read(proposal) });
  }
  const archiveDir = path.join(changesDir, "archive");
  if (isDir(archiveDir)) {
    const cutoff = Date.now() - SIMILAR_CHANGE_DAYS * 86400000;
    for (const name of readdirSync(archiveDir)) {
      const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      if (!m || Date.parse(`${m[1]}T00:00:00Z`) < cutoff) continue;
      const proposal = path.join(archiveDir, name, "proposal.md");
      if (isFile(proposal)) candidates.push({ id: m[2], where: /** @type {"open"|"archived"} */ ("archived"), rel: `.doctrina/changes/archive/${name}/`, text: read(proposal) });
    }
  }
  const out = [];
  for (const cand of candidates) {
    const title = (cand.text.match(/^#\s+Change\s+\S+\s+—\s+(.+)$/m)?.[1] ?? cand.id).trim();
    const why = cand.text.match(/##\s*Why\s*\r?\n+([^\r\n]+)/)?.[1] ?? "";
    const theirs = terms(`${cand.id.replace(/^\d+-/, "").replace(/-/g, " ")} ${title} ${why}`);
    const shared = asked.filter((t) => theirs.includes(t));
    if (shared.length < SIMILAR_MIN_SHARED) continue;
    // Each side's cover counts only the terms on that side: a word the Why
    // happens to share must not stand in for the title (a prompt about "the
    // work" matched "trabalho aparece para o humano" through its Why).
    const titleTerms = terms(title);
    const titleShared = asked.filter((t) => titleTerms.includes(t));
    const cover = Math.max(shared.length / asked.length, titleTerms.length > 0 ? titleShared.length / titleTerms.length : 0);
    if (cover >= SIMILAR_MIN_COVER) out.push({ id: cand.id, title, where: cand.where, path: cand.rel, shared, cover });
  }
  return out.sort((a, b) => b.cover - a.cover).map(({ cover: _c, ...rest }) => rest);
}
