// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, pruneEmptyDirs, read, remove, write, walk } from "./fs-ops.js";
import { parseFrontmatter } from "./doc-model.js";
import { describeAdapter, ADAPTER_STATES } from "./adapters.js";

// The project's skills, where the agent looks for skills (change 0212).
//
// A field review of an agent in Cursor: the editor's skill catalogue lists
// `~/.cursor/skills` and plugins, never `.doctrina/skills/`, so a skill that
// matched the task fired only when the request named its file. AGENTS.md
// said "skills are on demand"; nothing said the editor would never offer
// them. The agents now share a format — a folder per skill holding a
// SKILL.md with `name` and `description` — and discover it on their own:
// `.agents/skills/` (Cursor, Codex) and `.claude/skills/` (Claude Code;
// Cursor reads it too). `.doctrina/skills/` stays the one source; the
// exports are generated from it, marked as generated, and pruned with it.

export const EXPORT_MARK = "<!-- doctrina:skill-export";
const DESCRIPTION_MAX = 1024;

/** Where this project's skills are exported, as project-relative roots. */
export function exportRoots(projectRoot) {
  const roots = [".agents/skills"];
  if (describeAdapter(projectRoot, "claude").state === ADAPTER_STATES.INSTALLED) roots.push(".claude/skills");
  return roots;
}

/** The SKILL.md a Doctrina skill becomes. */
export function renderSkillExport(name, text) {
  const body = text.replace(/\r\n/g, "\n");
  const description = parseFrontmatter(body, "description") ?? name;
  const when = parseFrontmatter(body, "when");
  // The agent decides from the description alone, so the trigger goes in it.
  const full = (when ? `${description} Use when: ${when}` : description).replace(/\s+/g, " ").trim();
  const clipped = full.length > DESCRIPTION_MAX ? `${full.slice(0, DESCRIPTION_MAX - 1)}…` : full;
  const rest = body.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^\n+/, "");
  return [
    "---",
    `name: ${name}`,
    `description: ${JSON.stringify(clipped)}`,
    "---",
    `${EXPORT_MARK} — generated from .doctrina/skills/${name}.md by \`doctrina index rebuild\`; edit that file, not this one. -->`,
    "",
    rest,
  ].join("\n").replace(/\n*$/, "\n");
}

/**
 * What the export would change: files to write (missing or different) and
 * generated skill folders to remove (their source is gone). Folders not
 * carrying the generated mark are someone else's and never touched.
 *
 * @param {string} projectRoot
 * @returns {{ writes: Array<{ rel: string, body: string }>, removes: string[] }}
 */
export function planSkillExport(projectRoot) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  const skills = isDir(skillsDir)
    ? walk(skillsDir).filter((f) => f.endsWith(".md") && path.dirname(f) === skillsDir)
    : [];
  const wanted = new Map(skills.map((f) => [path.basename(f, ".md"), read(f)]));
  const writes = [];
  const removes = [];
  if (wanted.size === 0 && !exportRoots(projectRoot).some((r) => isDir(path.join(projectRoot, r)))) {
    return { writes, removes };
  }
  for (const root of exportRoots(projectRoot)) {
    for (const [name, text] of wanted) {
      const rel = `${root}/${name}/SKILL.md`;
      const body = renderSkillExport(name, text);
      const abs = path.join(projectRoot, rel);
      if (!isFile(abs) || read(abs).replace(/\r\n/g, "\n") !== body) writes.push({ rel, body });
    }
    const rootAbs = path.join(projectRoot, root);
    if (!isDir(rootAbs)) continue;
    for (const entry of readdirSync(rootAbs)) {
      const skillFile = path.join(rootAbs, entry, "SKILL.md");
      if (wanted.has(entry) || !isFile(skillFile)) continue;
      if (read(skillFile).includes(EXPORT_MARK)) removes.push(`${root}/${entry}/SKILL.md`);
    }
  }
  return { writes, removes };
}

/** Apply a plan; returns it. */
export function applySkillExport(projectRoot, plan = planSkillExport(projectRoot)) {
  for (const w of plan.writes) write(path.join(projectRoot, w.rel), w.body, { force: true });
  for (const r of plan.removes) {
    remove(path.join(projectRoot, r)); // the generated file only
    pruneEmptyDirs(path.dirname(path.join(projectRoot, r)), projectRoot);
  }
  return plan;
}
