// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import { git, GIT_STATE } from "./git.js";
import { FIX_SHAPED, FIX_SHAPED_SUBJECT, skillSlug } from "./lexicon.js";

// The lessons worth a skill, as DATA (change 0202). `skill suggest` listed
// them and `close` printed that whole listing at the end of every close —
// the same thirteen candidates, close after close, which a field review of
// 0.17 called noise. The close now asks for the list and renders only what
// THIS close produced, so the collection lives here, where both read it
// (ADR 0025: commands render, lib decides).

/**
 * @typedef {object} SkillCandidate
 * @property {string} id
 * @property {string} slug
 * @property {"change"|"commit"} source
 * @property {string} [from]  archive folder name, for a change candidate
 * @property {string} [ref]   short sha, for a commit candidate
 * @property {string} [why]
 */

/**
 * Fix-shaped lessons not yet captured as a skill, from the archive and the
 * git history, deduped by slug.
 *
 * @param {string} projectRoot
 * @param {{ since?: string, limit?: number }} [opts]
 * @returns {SkillCandidate[]}
 */
export function skillCandidates(projectRoot, { since, limit = 200 } = {}) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  const existingFiles = isDir(skillsDir) ? walk(skillsDir).filter((f) => f.endsWith(".md")) : [];
  const existing = new Set(existingFiles.map((f) => path.basename(f, ".md")));
  // A lesson may already be captured under a DIFFERENT slug (0.11.0 field
  // review item 11: the human names the skill after the lesson, not after the
  // change id — "tela-preta-crash-de-render..." for change 0049). Two extra
  // dedup signals: an existing skill whose body cites the candidate's change
  // id / commit hash, and token-overlap similarity between the slugs.
  const existingBodies = existingFiles.map((f) => ({ slug: path.basename(f, ".md"), body: read(f) }));
  const captured = (cand) => {
    if (existing.has(cand.slug)) return true;
    for (const sk of existingBodies) {
      if (cand.id && sk.body.includes(cand.id)) return true;
      if (cand.from && sk.body.includes(cand.from)) return true;
      if (slugSimilarity(cand.slug, sk.slug) >= 0.5) return true;
    }
    return false;
  };

  // Two deterministic sources, deduped by slug. `seen` guards against a lesson
  // appearing twice (e.g. a fix committed and later archived as a change).
  /** @type {SkillCandidate[]} */
  const candidates = [];
  const seen = new Set();

  // Source 1 — archived change proposals with a fix-shaped folder name.
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");
  if (isDir(archiveDir)) {
    for (const name of readdirSync(archiveDir).sort()) {
      if (!isDir(path.join(archiveDir, name))) continue;
      const id = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      if (!FIX_SHAPED.test(id)) continue;
      const slug = skillSlug(id);
      if (seen.has(slug)) continue;
      /** @type {SkillCandidate} */
      const cand = { id, slug, source: "change", from: name };
      if (captured(cand)) continue; // captured (any slug) or cited by an existing skill
      const proposal = path.join(archiveDir, name, "proposal.md");
      cand.why = isFile(proposal) ? firstWhyLine(read(proposal)) : "";
      seen.add(slug);
      candidates.push(cand);
    }
  }

  // Source 2 — fix-shaped commits in the git history (ADR 0013). Archive wins a
  // slug collision: a `## Why` paragraph is a richer seed than a subject line.
  for (const cand of gitFixCommits(projectRoot, { since, limit })) {
    if (seen.has(cand.slug) || captured(cand)) continue;
    seen.add(cand.slug);
    candidates.push(cand);
  }

  return candidates;
}

// Source 2 for `skill suggest`: fix-shaped commits in the git history (ADR
// 0013). Deterministic — a regex on the subject, never a read of the diff
// (ADR 0005 semantic-fidelity ceiling). Returns [] silently when this is not a
// git repo, git is absent, or the --since ref is unknown, so the command
// degrades to archive-only rather than erroring.
function gitFixCommits(projectRoot, { since, limit }) {
  // US (0x1f) between fields, RS (0x1e) between records — robust against any
  // newline or punctuation inside a subject or body.
  const format = "%H%x1f%s%x1f%b%x1e";
  const args = ["log", "--no-merges", `--format=${format}`];
  if (since) args.push(`${since}..HEAD`);
  else args.push("-n", String(limit));

  const r = git(projectRoot, args);
  if (r.state !== GIT_STATE.OK || !r.stdout) return [];

  /** @type {SkillCandidate[]} */
  const out = [];
  const seen = new Set();
  for (const record of r.stdout.split("\x1e")) {
    const [sha, subject = "", body = ""] = record.replace(/^\r?\n/, "").split("\x1f");
    if (!sha || !sha.trim()) continue;
    if (!FIX_SHAPED_SUBJECT.test(subject)) continue;
    const slug = commitSlug(subject);
    if (!slug || seen.has(slug)) continue; // first commit wins a duplicate lesson
    seen.add(slug);
    const firstBodyLine = body.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
    out.push({
      id: slug,
      slug,
      source: "commit",
      ref: sha.trim().slice(0, 9),
      why: subject.trim() + (firstBodyLine ? ` — ${firstBodyLine}` : ""),
    });
  }
  return out;
}

// Derive a skill slug from a commit subject: drop a conventional-commit
// "type(scope): " prefix and hand the rest to the shared slug, which folds.
function commitSlug(subject) {
  return skillSlug(subject.replace(/^[a-z]+(?:\([^)]*\))?!?\s*:\s*/i, ""));
}

// Token-overlap similarity between two kebab slugs (Jaccard over meaningful
// tokens). "0049-fix-tela-preta-render" vs "tela-preta-crash-de-render-sem-
// error-boundary" share tela/preta/render → high overlap even though the
// human renamed the skill after the lesson. Deterministic; never semantic.
function slugSimilarity(a, b) {
  const toks = (s) => new Set(
    String(s).split("-").filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !SLUG_NOISE.has(t)),
  );
  const A = toks(a);
  const B = toks(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

// Fix-shaped verbs and connectives carry no lesson identity — without this,
// every "fix-..." candidate looks 30% similar to every "fix-..." skill.
const SLUG_NOISE = new Set([
  "fix", "bug", "hotfix", "patch", "the", "and", "for", "with", "sem", "com",
  "que", "nao", "por", "para", "una", "uma", "dos", "das",
]);

function firstWhyLine(proposalText) {
  const m = proposalText.match(/##\s*Why\s*\r?\n+([^\r\n][^\r\n]*)/i);
  if (!m) return "";
  const line = m[1].trim();
  return /^<!--/.test(line) ? "" : line;
}

