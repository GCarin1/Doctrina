// @ts-check
import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, mkdirp, read, relPath, walk, write } from "../lib/fs-ops.js";
import { readTemplate, locateTemplatesDir, substitute } from "../lib/templates.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString, flagGivenWithoutValue } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { skillCandidates } from "../lib/skill-candidates.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { parseFrontmatter } from "../lib/doc-model.js";
import { fold, skillSlug } from "../lib/lexicon.js";
import { artifactNameError } from "../lib/names.js";

const SUBCOMMANDS = ["new", "list", "sync", "suggest"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "force", "write"], string: ["since", "from-error"] };

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
// writing one. `skill suggest` scans for fix-shaped work — the textbook case for
// a skill — from two deterministic sources and lists candidates whose lesson is
// not yet captured: archived change proposals, and the git commit history
// (ADR 0013). The archive only fills if a team runs the `doctrina change`
// lifecycle, so without the git source `suggest` is inert in most repos. With
// --write it scaffolds a stub per candidate, pre-seeded from the source so the
// human/agent only fills the body. Both sources are a pattern match — a hint,
// never a decision (ADR 0005); skills are still authored, never generated.


// How far back the git source looks when --since is not given, and how many
// candidates we print before collapsing the rest into a "+N more" line.
const GIT_LOG_LIMIT = 200;
const MAX_SHOWN = 20;

// A skill drafted from the ERROR that taught the lesson (change 0029).
//
// `suggest` used to fire only after the fact — a skill was born when the
// agent remembered to write one, which is to say after the incident had
// already cost a session. The moment the lesson actually exists is the
// moment the error is on screen, and that text carries exactly what a
// trigger needs: the paths, the identifiers, the message itself.
//
// The draft is a SEED, not a skill. It fills the trigger — the field a
// human is least likely to write in a matchable form — and leaves the
// procedure to the person who just solved it.
const ERROR_STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "was",
  "were", "not", "but", "you", "your", "are", "its", "it's", "can", "could",
  "would", "should", "will", "when", "then", "than", "there", "their", "been",
  "error", "warning", "failed", "failure", "exception", "traceback", "at",
  "line", "file", "in", "on", "of", "to", "is", "a", "an", "no", "if",
  // Stack-trace furniture and modal verbs: present in almost every error,
  // distinctive in none, and they crowd out the words that identify one.
  "most", "recent", "call", "calls", "last", "raise", "raised", "throw",
  "thrown", "must", "one", "none", "self", "return", "returns", "def",
  "module", "stack", "trace", "during", "handling", "above", "occurred",
  "caused", "unexpected", "invalid", "expected", "got", "value", "values",
]);

export function draftFromError(text) {
  const raw = String(text ?? "").trim();
  if (raw === "") return null;

  // Paths and file references: the most matchable thing an error carries.
  const paths = [...new Set(
    (raw.match(/[\w.@-]+(?:[/\\][\w.@-]+)+(?:\.\w{1,6})?|[\w-]+\.(?:py|js|mjs|cjs|ts|tsx|yml|yaml|json|feature|go|rb|java|rs|sh|toml|ini|env)\b/g) ?? [])
      .map((p) => p.replace(/[.,;:)\]]+$/, "")),
  )].slice(0, 4);

  // ALL_CAPS identifiers: env vars, error codes, constants.
  const identifiers = [...new Set(raw.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) ?? [])].slice(0, 4);

  // Quoted fragments are usually the operative part of the message — but a
  // traceback quotes its own filenames, and repeating a path already
  // captured above buys nothing.
  const quoted = [...new Set(
    [...raw.matchAll(/["'`]([^"'`\n]{4,60})["'`]/g)].map((m) => m[1].trim()),
  )].filter((q) => !paths.includes(q)).slice(0, 2);

  // Distinctive words, most frequent first — the fallback when an error
  // carries no structure at all.
  const counts = new Map();
  for (const w of fold(raw).match(/[a-z][a-z0-9_-]{3,}/g) ?? []) {
    if (ERROR_STOP.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const keywords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([w]) => w)
    .slice(0, 6);

  // The trigger, built to be MATCHED: concrete tokens first, prose second.
  const anchors = [...quoted, ...identifiers, ...keywords.slice(0, 3)].slice(0, 4);
  const wherePart = paths.length > 0 ? `, or work touches ${paths.slice(0, 2).map((p) => `\`${p}\``).join(" / ")}` : "";
  const when = anchors.length > 0
    ? `The task hits ${anchors.map((a) => `"${a}"`).join(" / ")}${wherePart}.`
    : `The task reproduces: ${firstLine(raw).slice(0, 90)}.`;

  // The slug seeds from identifiers first, then keywords — deduped on the
  // NORMALISED token, so AXE_SEVERITY and the "axe_severity" the same error
  // also mentions do not both land in the name.
  const seedTokens = [];
  const seenToken = new Set();
  for (const token of [...identifiers.map((i) => fold(i)), ...keywords]) {
    const norm = fold(token).replace(/[^a-z0-9]/g, "");
    if (norm === "" || seenToken.has(norm)) continue;
    seenToken.add(norm);
    seedTokens.push(token);
    if (seedTokens.length === 4) break;
  }
  const slug = skillSlug(seedTokens.join("-") || firstLine(raw)) || "captured-error";

  return {
    slug,
    when,
    keywords,
    paths,
    identifiers,
    excerpt: raw.split(/\r?\n/).slice(0, 12).join("\n"),
    source: "error",
  };
}

function firstLine(text) {
  return String(text).split(/\r?\n/).find((l) => l.trim() !== "")?.trim() ?? "";
}

// Preview or scaffold one error-seeded draft.
function writeErrorDraft(projectRoot, draft, doWrite) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  const target = path.join(skillsDir, `${draft.slug}.md`);

  if (!doWrite) {
    console.log(c.bold("Skill draft") + c.gray(" — seeded from the error you just hit:"));
    console.log("");
    console.log(`  ${c.cyan("slug")}   ${draft.slug}`);
    console.log(`  ${c.cyan("when")}   ${draft.when}`);
    if (draft.paths.length > 0) console.log(`  ${c.cyan("paths")}  ${draft.paths.join(", ")}`);
    console.log("");
    if (exists(target)) {
      console.log(c.yellow("note: ") + `${relPath(projectRoot, target)} already exists — writing would skip it`);
    }
    console.log(c.gray("Scaffold it: ") + c.cyan("doctrina skill suggest --from-error <text|file> --write"));
    console.log(c.gray("The trigger is drafted; the procedure is yours to write while you still remember it."));
    return 0;
  }

  if (exists(target)) {
    console.log(c.yellow("skip   ") + ` ${draft.slug} (already exists)`);
    return 0;
  }

  const tpl = read(path.join(locateTemplatesDir(), "skill.md.template"));
  let body = substitute(tpl, { SKILL_NAME: draft.slug });
  // Fill the trigger — the field a human is least likely to write in a form
  // anything can match, and the one `context` ranks on.
  body = body.replace(
    /^when: .*$/m,
    `when: ${draft.when.replace(/\r?\n/g, " ")}`,
  );
  body += `\n<!-- Seeded from an error. The failure to capture:\n\n${draft.excerpt}\n-->\n`;

  mkdirp(skillsDir);
  write(target, body, { force: false });

  const index = idx.load(projectRoot);
  const date = today();
  idx.addSkill(index, {
    id: draft.slug,
    path: `.doctrina/skills/${draft.slug}.md`,
    description: parseFrontmatter(body, "description") ?? "<edit me — one-sentence summary>",
    last_updated: date,
  });
  idx.touch(index, date);
  idx.save(projectRoot, index);

  console.log(c.green("created") + ` ${relPath(projectRoot, target)}`);
  console.log(c.gray("The trigger is drafted from the error. Write the procedure while you still remember it,"));
  console.log(c.gray("then fill `description:` — `doctrina validate` warns on a trigger nothing can match."));
  return 0;
}

function skillSuggest(args, flags) {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const doWrite = flagBool(flags, "write", false);
  const since = flagString(flags, "since");

  // --from-error: draft from the failure that is on screen RIGHT NOW,
  // rather than waiting for the lesson to be remembered later. When given,
  // it is the only source — this is a specific request, not a survey.
  // A value-taking flag written without a value is a usage error, not a
  // silent fall-through to the survey — `--from-error` with nothing after
  // it would otherwise run the ordinary scan and look like it worked.
  if (flagGivenWithoutValue(flags, "from-error")) {
    console.error(c.red("error:") + " --from-error needs the error text, or a path to a file holding it");
    return 2;
  }
  const fromError = flagString(flags, "from-error");
  if (fromError !== undefined) {
    if (fromError === "" || fromError === null) {
      console.error(c.red("error:") + " --from-error needs the error text, or a path to a file holding it");
      return 2;
    }
    // A path is read; anything else is taken as the text itself.
    const asPath = path.resolve(projectRoot, fromError);
    const text = isFile(asPath) ? read(asPath) : fromError;
    const draft = draftFromError(text);
    if (!draft) {
      console.error(c.red("error:") + " --from-error was given nothing to draft from");
      return 2;
    }
    return writeErrorDraft(projectRoot, draft, doWrite);
  }

  const candidates = skillCandidates(projectRoot, { since, limit: GIT_LOG_LIMIT });
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");

  if (candidates.length === 0) {
    console.log(c.gray("no uncaptured fix-shaped lessons found in .doctrina/changes/archive/ or the git history"));
    console.log(c.gray("(scans archived changes and fix-shaped commits — pass --since <ref> to widen the git window;"));
    console.log(c.gray(" skills are written by humans, so this only surfaces candidates — `doctrina skill new <slug>` to author one)"));
    return 0;
  }

  if (!doWrite) {
    console.log(c.bold("Skill candidates") + c.gray(" — fix-shaped lessons not yet captured:"));
    console.log("");
    for (const cand of candidates.slice(0, MAX_SHOWN)) {
      console.log(`  ${c.cyan(cand.slug.padEnd(28))} ${c.gray(provenance(cand))}`);
      if (cand.why) console.log(`    ${c.gray(cand.why.slice(0, 90))}`);
    }
    const hidden = candidates.length - MAX_SHOWN;
    if (hidden > 0) console.log(c.gray(`  … +${hidden} more`));
    console.log("");
    console.log(c.gray(`${candidates.length} candidate${candidates.length === 1 ? "" : "s"}. Scaffold them: `) + c.cyan("doctrina skill suggest --write"));
    return 0;
  }

  // --write: scaffold a stub per candidate, pre-seeded from its source.
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
      body += `\n<!-- ${seedLabel(cand)}. The lesson to capture:\n${cand.why}\n-->\n`;
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
  console.log(c.green("ok") + ` scaffolded ${created} skill stub${created === 1 ? "" : "s"} — fill the description/when/body, then \`doctrina index rebuild\``);
  return 0;
}

// One-line origin shown next to a candidate slug.
function provenance(cand) {
  return cand.source === "commit" ? `from commit ${cand.ref}` : `from ${cand.from}`;
}

// The label seeded into a scaffolded skill body so the author knows where the
// lesson came from.
function seedLabel(cand) {
  return cand.source === "commit"
    ? `Candidate from commit ${cand.ref}`
    : `Candidate from change "${cand.id}"`;
}

function skillNew(args, flags) {
  const name = args[0];
  const nameError = artifactNameError(name, "skill name");
  if (nameError) {
    console.error(c.red("error:") + ` ${nameError} (e.g. "db-migration")`);
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

  const tpl = readTemplate(projectRoot, "skill.md.template");
  const body = substitute(tpl.body, { SKILL_NAME: name });
  write(targetPath, body, { force });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}` +
    (tpl.source === "project" ? c.gray(" (project template)") : ""));

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
  console.log(c.gray("hint: ") + "fill the description and when frontmatter fields, then run `doctrina index rebuild` to update index.json");
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
    // A description still in the template's `<...>` form is not "up to
    // date" (change 0111): it is a file nobody wrote yet, and mirroring it
    // into the index is what put the placeholder in every context pack.
    if (/^<[^<>]*>$/.test(desc.trim())) {
      console.log(c.yellow("scaffold") + ` ${id} — description is still the scaffold's placeholder; write description/when, then sync`);
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


function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
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
  suggest [--write] [--since <ref>] [--from-error <text|file>]
                Surface fix-shaped lessons not yet captured as skills,
                from two sources: archived change proposals and the git
                commit history (ADR 0013). --write scaffolds a stub per
                candidate (pre-seeded from its source) to fill in.
                --since <ref> scans commits in <ref>..HEAD instead of the
                last 200 (e.g. --since v0.7.0).

                --from-error <text|file> drafts ONE skill from the failure
                on screen right now, instead of waiting for the lesson to
                be remembered later. It fills the \`when:\` trigger from the
                error's own paths, identifiers and message — the field a
                human is least likely to write in a form anything can
                match, and the one \`context\` ranks on. The procedure stays
                yours to write. Add --write to scaffold it.

Skills are written by humans, not generated. See docs/en/skills.md
for the design rationale and the distinction from specs / AGENTS.md /
the rejected memory/ folder.
`;
