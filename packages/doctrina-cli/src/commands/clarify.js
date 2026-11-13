// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, walk } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { scanFile } from "../lib/clarify-scan.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";

// --lang pt|en wins over the project config and the per-file heuristic
// (operator review 2026-07-19 §4.8: on a PT-BR project with no config.json,
// a file whose stopword count tips English gets the EN lexicon and "some" —
// the verb *sumir* — is flagged as the vague quantifier). One flag, zero
// guessing; persist it with .doctrina/config.json { "language": "pt-BR" }.
function forcedLang(flags) {
  const raw = flagString(flags, "lang");
  if (!raw) return null;
  const lang = String(raw).toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("en")) return "en";
  console.error(c.yellow("warn:") + ` unknown --lang "${raw}" (use pt|en) — falling back to detection`);
  return null;
}

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "all"], string: ["lang"] };

export async function run(positional, flags) {
  const projectRoot = process.cwd();

  if (flagBool(flags, "all", false)) return clarifyAll(projectRoot, forcedLang(flags));

  const target = positional[0];
  if (!target) {
    console.error(c.red("error:") + " clarify requires a path to a Markdown file (or --all)");
    return 2;
  }
  const fullPath = path.resolve(projectRoot, target);
  if (!isFile(fullPath)) {
    // USAGE, not GATE (third audit, finding 9). A path that does not exist
    // is a wrong invocation: retrying it unchanged never succeeds, and an
    // agent branching on the exit code reads 1 as "the work is not ready"
    // and iterates forever (ADR 0018). Every sibling that takes a path —
    // `intake --file`, `init --intake-file`, `templates check --path` —
    // already exits 2 here; `clarify` was the straggler.
    console.error(c.red("error:") + ` file not found: ${target}`);
    console.error(c.gray("hint: ") + "pass a path to an existing Markdown file, or `--all` for the tree");
    return EXIT.USAGE;
  }

  console.log(`clarify ${relPath(projectRoot, fullPath)}`);
  console.log("");

  const smells = scanFile(fullPath, projectRoot, forcedLang(flags));
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
function clarifyAll(projectRoot, lang = /** @type {string | null} */ (null)) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
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
    const smells = scanFile(f, projectRoot, lang);
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

export const help = `
Usage: doctrina clarify <path> [--lang pt|en]
       doctrina clarify --all [--lang pt|en]

Read a Markdown file and report weasel words, vague quantifiers,
placeholders, and empty Acceptance criteria sections. Exits 0 when
no smells are found, 1 otherwise. Matches inside fenced code
blocks, HTML comments, and inline backtick spans are skipped.

Language-aware: --lang pt|en forces the lexicon; otherwise
.doctrina/config.json ({ "language": "pt-BR" }) decides, else a
per-file stopword count. Portuguese mode uses a PT lexicon (bare
TODO is the pronoun, only "TODO:" is a marker; "some"/"several" are
not smells). A line ending in <!-- clarify:ok --> is author-accepted
and never flagged — the escape hatch for a false positive.

With --all, every living document is scanned in one pass:
product.md, capability specs, open changes, and skills. ADRs
(immutable) and the archive (history) are excluded. CI-friendly.

Intended use: run before \`doctrina change apply\` or before
opening a PR. The command never modifies files.
`;
