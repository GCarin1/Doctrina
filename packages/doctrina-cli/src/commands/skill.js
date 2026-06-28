import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, mkdirp, read, relPath, walk, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["new", "list", "sync", "suggest"];

export async function run(positional, flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown skill subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina skill ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  if (sub === "new") return skillNew(positional.slice(1), flags);
  if (sub === "sync") return skillSync();
  if (sub === "suggest") return skillSuggest(positional.slice(1), flags);
  return skillList();
}

// Surface (and optionally scaffold) skills worth capturing (review 2026-06-27
// passive-user feature #6). A skill exists so a hard-won lesson is not relearned
// by the next agent/session; the framework otherwise never pulls you toward
// writing one. `skill suggest` scans the archived changes for fix-shaped work —
// the textbook case for a skill — and lists candidates whose lesson is not yet
// captured. With --write it scaffolds a stub per candidate, pre-seeded from the
// change so the human/agent only fills the body. Deterministic pattern match on
// the archived folder name — a hint, never a decision (ADR 0005).
const FIX_SHAPED = /(?:^|-)(fix|bug|hotfix|patch|parse|parsing|tolerate|workaround|race|deadlock|flaky|retry|escape|sanitize|sanitise)(?:-|$)/;

function skillSuggest(args, flags) {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const doWrite = flagBool(flags, "write", false);

  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  const existing = new Set(
    isDir(skillsDir) ? walk(skillsDir).filter((f) => f.endsWith(".md")).map((f) => path.basename(f, ".md")) : [],
  );

  const candidates = [];
  if (isDir(archiveDir)) {
    for (const name of readdirSync(archiveDir).sort()) {
      if (!isDir(path.join(archiveDir, name))) continue;
      const id = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      if (!FIX_SHAPED.test(id)) continue;
      const slug = skillSlug(id);
      if (existing.has(slug)) continue; // lesson already captured
      const proposal = path.join(archiveDir, name, "proposal.md");
      const why = isFile(proposal) ? firstWhyLine(read(proposal)) : "";
      candidates.push({ id, slug, why, archive: name });
    }
  }

  if (candidates.length === 0) {
    console.log(c.gray("no uncaptured fix-shaped lessons found in .doctrina/changes/archive/"));
    console.log(c.gray("(skills are written by humans; this only surfaces candidates — `doctrina skill new <slug>` to author one)"));
    return 0;
  }

  if (!doWrite) {
    console.log(c.bold("Skill candidates") + c.gray(" — fix-shaped lessons not yet captured:"));
    console.log("");
    for (const cand of candidates) {
      console.log(`  ${c.cyan(cand.slug.padEnd(28))} ${c.gray("from " + cand.archive)}`);
      if (cand.why) console.log(`    ${c.gray(cand.why.slice(0, 90))}`);
    }
    console.log("");
    console.log(c.gray(`${candidates.length} candidate${candidates.length === 1 ? "" : "s"}. Scaffold them: `) + c.cyan("doctrina skill suggest --write"));
    return 0;
  }

  // --write: scaffold a stub per candidate, pre-seeded from the change.
  const templatesDir = locateTemplatesDir();
  const tplPath = path.join(templatesDir, "skill.md.template");
  const tpl = read(tplPath);
  mkdirp(skillsDir);
  const index = idx.load(projectRoot);
  const date = today();
  let created = 0;
  for (const cand of candidates) {
    const target = path.join(skillsDir, `${cand.slug}.md`);
    if (exists(target)) {
      console.log(c.yellow("skip   ") + ` ${cand.slug} (already exists)`);
      continue;
    }
    let body = substitute(tpl, { SKILL_NAME: cand.slug });
    if (cand.why) {
      // Drop the originating lesson into the body so authoring is "fill", not "start".
      body += `\n<!-- Candidate from change "${cand.id}". The lesson to capture:\n${cand.why}\n-->\n`;
    }
    write(target, body, { force: false });
    idx.addSkill(index, {
      id: cand.slug,
      path: `.doctrina/skills/${cand.slug}.md`,
      description: parseFrontmatter(body, "description") ?? "<edit me — one-sentence summary>",
      last_updated: date,
    });
    console.log(c.green("created") + ` ${relPath(projectRoot, target)}`);
    created += 1;
  }
  if (created > 0) {
    idx.touch(index, date);
    idx.save(projectRoot, index);
  }
  console.log("");
  console.log(c.green("ok") + ` scaffolded ${created} skill stub${created === 1 ? "" : "s"} — fill the description/when/body, then \`doctrina skill sync\``);
  return 0;
}

function skillSlug(id) {
  // Reuse the change id as the skill slug, trimmed to a sane length.
  const slug = id.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 40 ? slug.slice(0, 40).replace(/-+$/g, "") : (slug || "lesson");
}

function firstWhyLine(proposalText) {
  const m = proposalText.match(/##\s*Why\s*\r?\n+([^\r\n][^\r\n]*)/i);
  if (!m) return "";
  const line = m[1].trim();
  return /^<!--/.test(line) ? "" : line;
}

function skillNew(args, flags) {
  const name = args[0];
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(c.red("error:") + " skill name must be lowercase letters, digits, or hyphens (e.g. \"db-migration\")");
    return 2;
  }
  const force = flagBool(flags, "force", false);
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  mkdirp(skillsDir);
  const targetPath = path.join(skillsDir, `${name}.md`);
  if (exists(targetPath) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, targetPath)} already exists (pass --force to overwrite)`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const tplPath = path.join(templatesDir, "skill.md.template");
  const body = substitute(read(tplPath), { SKILL_NAME: name });
  write(targetPath, body, { force });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}`);

  const date = today();
  const index = idx.load(projectRoot);
  idx.addSkill(index, {
    id: name,
    path: `.doctrina/skills/${name}.md`,
    // Seed the index from the scaffolded frontmatter so a fresh skill does
    // not immediately trip validate's description-drift check. Matches how
    // deriveIndex (index rebuild) reads the description.
    description: parseFrontmatter(body, "description") ?? "<edit me — one-sentence summary>",
    last_updated: date,
  });
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` skill "${name}"`);
  console.log("");
  console.log(c.gray("hint: ") + "fill the description and when frontmatter fields, then run `doctrina skill sync` to update index.json");
  return 0;
}

function skillSync() {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (!isDir(skillsDir)) {
    console.log(c.gray("no skills directory; nothing to sync"));
    return 0;
  }

  const files = walk(skillsDir).filter((f) => f.endsWith(".md"));
  const index = idx.load(projectRoot);
  const date = today();
  let synced = 0;

  for (const f of files) {
    const id = path.basename(f, ".md");
    const desc = parseFrontmatter(read(f), "description");
    if (!desc) {
      console.log(c.yellow("skip   ") + ` ${id} (no description frontmatter)`);
      continue;
    }
    const entry = (index.artifacts.skills ?? []).find((s) => s.id === id);
    if (!entry) {
      idx.addSkill(index, {
        id,
        path: `.doctrina/skills/${id}.md`,
        description: desc,
        last_updated: date,
      });
      console.log(c.green("indexed") + ` ${id}`);
      synced += 1;
    } else if (entry.description !== desc) {
      entry.description = desc;
      entry.last_updated = date;
      console.log(c.green("synced ") + ` ${id}`);
      synced += 1;
    }
  }

  if (synced > 0) {
    idx.touch(index, date);
    idx.save(projectRoot, index);
  }
  console.log("");
  console.log(c.green("ok") + ` ${synced} skill${synced === 1 ? "" : "s"} synced, ${files.length - synced} already up to date`);
  return 0;
}

function skillList() {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (!isDir(skillsDir)) {
    console.log(c.gray("no skills directory; create one with `doctrina skill new <name>`"));
    return 0;
  }

  const files = walk(skillsDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.log(c.gray("no skills found in .doctrina/skills/"));
    return 0;
  }

  console.log(c.bold("Skills:"));
  console.log("");
  for (const f of files) {
    const text = read(f);
    const name = parseFrontmatter(text, "name") ?? path.basename(f, ".md");
    const desc = parseFrontmatter(text, "description") ?? c.gray("<missing description>");
    console.log(`  ${c.cyan(name.padEnd(24))}  ${desc}`);
  }
  console.log("");
  console.log(c.gray(`${files.length} skill${files.length === 1 ? "" : "s"}`));
  return 0;
}

function parseFrontmatter(text, key) {
  // Match frontmatter blocks bounded by `---` lines at start of file.
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return null;
  const block = fmMatch[1];
  const lineRe = new RegExp(`^${key}\\s*:\\s*(.+)$`, "m");
  const m = block.match(lineRe);
  return m ? m[1].trim() : null;
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
}

export const help = `
Usage: doctrina skill <subcommand>

Manage on-demand procedural memory — specialised "how to do X"
knowledge loaded only when relevant.

Subcommands:
  new <name>    Scaffold a new skill from the template and index
                it. Name must match [a-z][a-z0-9-]*.
  list          Print one line per skill with name + description.
                Read-only.
  sync          Copy each skill's frontmatter description into
                .doctrina/index.json so the index never drifts
                from the frontmatter (single source of truth).
  suggest [--write]
                Surface fix-shaped lessons in the change archive whose
                skill is not yet captured. --write scaffolds a stub per
                candidate (pre-seeded from the change) to fill in.

Skills are written by humans, not generated. See docs/en/skills.md
for the design rationale and the distinction from specs / AGENTS.md /
the rejected memory/ folder.
`;

// Re-export the frontmatter parser so validate.js can reuse it.
export { parseFrontmatter };
