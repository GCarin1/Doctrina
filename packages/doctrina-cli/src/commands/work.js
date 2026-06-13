import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { changeNew } from "./change.js";

// `work` is the second half of the no-ceremony path (ADR 0005): a brief
// prompt ("add login") becomes a fully scaffolded change plus a playbook
// the host agent executes — context, spec deltas, tasks, implementation,
// then the analyze → apply → archive → validate close. The CLI's own
// language processing stops at slugging and term counting; everything
// semantic is the agent's job.

export async function run(positional, flags) {
  const prompt = positional.join(" ").trim();
  if (!prompt) {
    console.error(c.red("error:") + " work requires a prompt (quote it if it contains spaces)");
    console.error(c.gray("hint: ") + "example: doctrina work \"add login with email and password\"");
    return 2;
  }

  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  const pinned = flagString(flags, "capability");
  if (pinned && !/^[a-z][a-z0-9-]*$/.test(pinned)) {
    console.error(c.red("error:") + ` invalid capability "${pinned}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  const id = flagString(flags, "id") ?? `${nextChangeNumber(projectRoot)}-${slugify(prompt)}`;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    console.error(c.red("error:") + ` invalid change id "${id}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  const code = changeNew([id, prompt], flags);
  if (code !== 0) return code;

  // Record the prompt verbatim as the change's Why — the raw intent has
  // one home, and it is the proposal, not the playbook output.
  const proposalPath = path.join(projectRoot, ".doctrina", "changes", id, "proposal.md");
  if (isFile(proposalPath)) {
    const txt = read(proposalPath);
    // CRLF-tolerant: templates may be checked out with \r\n on Windows.
    let updated = txt.replace(/(## Why\r?\n\r?\n)<!--[\s\S]*?-->[ \t]*\r?\n?/, `$1${prompt}\n`);
    if (updated === txt) updated = txt.replace(/(## Why\r?\n)/, `$1\n${prompt}\n`);
    if (pinned) {
      updated = updated.replace(/^(-\s+\*\*Affects specs:\*\*).*$/m, `$1 ${pinned}`);
    }
    if (updated !== txt) write(proposalPath, updated, { force: true });
  }

  const matches = pinned ? [] : rankCapabilities(projectRoot, prompt);
  const capability = pinned ?? matches[0]?.id ?? null;

  console.log("");
  printPlaybook(projectRoot, { id, prompt, pinned, matches, capability });
  return 0;
}

// Next sequential NNNN across open changes and the archive, so work-driven
// ids stay ordered no matter how earlier changes were named.
function nextChangeNumber(projectRoot) {
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  let max = 0;
  const harvest = (name) => {
    const m = name.match(/^(\d{1,4})-/) ?? name.match(/^(\d{1,4})$/);
    if (m) max = Math.max(max, Number(m[1]));
  };
  if (isDir(changesDir)) {
    for (const entry of readdirSync(changesDir)) {
      if (entry === "archive" || entry.startsWith(".")) continue;
      if (isDir(path.join(changesDir, entry))) harvest(entry);
    }
  }
  const archiveDir = path.join(changesDir, "archive");
  if (isDir(archiveDir)) {
    for (const entry of readdirSync(archiveDir)) {
      if (!isDir(path.join(archiveDir, entry))) continue;
      harvest(entry.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
    }
  }
  return String(max + 1).padStart(4, "0");
}

// ASCII-folded kebab-case of the prompt ("Faça o login" -> "faca-o-login").
export function slugify(text) {
  let slug = text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > 48) slug = slug.slice(0, 48).replace(/-+$/g, "");
  return slug.length > 0 ? slug : "task";
}

// Deterministic term overlap: fold prompt and spec text to ASCII lowercase,
// drop short/stop words, score name hits heavily and body hits lightly.
// This is a hint for the agent, never a decision (ADR 0005).
const STOPWORDS = new Set([
  // en
  "the", "and", "for", "with", "from", "that", "this", "into", "when",
  "then", "shall", "should", "must", "can", "will", "make", "add", "new",
  "use", "create", "implement", "feature", "system", "user", "users",
  // pt (ASCII-folded)
  "uma", "umas", "uns", "dos", "das", "nos", "nas", "por", "para", "com",
  "que", "sem", "aos", "faca", "fazer", "criar", "crie", "novo", "nova",
  "adicionar", "adicione", "implementar", "implemente", "funcionalidade",
  "sistema", "usuario", "usuarios",
]);

function fold(text) {
  return text.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

function promptTerms(prompt) {
  return [...new Set(
    fold(prompt)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  )];
}

export function rankCapabilities(projectRoot, prompt) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const terms = promptTerms(prompt);
  if (terms.length === 0 || !isDir(specsDir)) return [];

  const ranked = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const body = fold(read(specPath));
    const nameTokens = cap.split("-");
    let score = 0;
    for (const term of terms) {
      if (nameTokens.includes(term)) score += 5;
      const hits = body.split(term).length - 1;
      score += Math.min(hits, 5);
    }
    if (score > 0) ranked.push({ id: cap, score, path: `.doctrina/specs/${cap}/spec.md` });
  }
  return ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3);
}

function printPlaybook(projectRoot, { id, prompt, pinned, matches, capability }) {
  const capToken = capability ?? "<capability>";
  console.log(c.bold(`Work playbook — change ${id}`) + c.gray(" — agent-executed (ADR 0005)."));
  console.log("");
  console.log(`Prompt: "${prompt}"`);

  if (pinned) {
    const hasSpec = isFile(path.join(projectRoot, ".doctrina", "specs", pinned, "spec.md"));
    console.log(`Capability (pinned): ${c.cyan(pinned)}` +
      (hasSpec ? "" : c.yellow(" — no spec yet; create it in step 2")));
  } else if (matches.length > 0) {
    console.log("Likely capabilities (deterministic term match — a hint, not a decision):");
    for (const m of matches) {
      console.log(`    ${c.cyan(m.id.padEnd(20))} score ${String(m.score).padStart(3)}   ${c.gray(m.path)}`);
    }
  } else {
    console.log(c.gray("No existing spec matches the prompt — likely a new capability."));
  }

  console.log("");
  console.log("Execute in order, in a single linear pass:");
  console.log("");
  console.log("1. Read the context pack and confirm (or correct) the capability:");
  console.log(`       ${c.cyan(`doctrina context ${capToken} --concat`)}`);
  console.log("");
  console.log("2. If the capability has no spec yet:");
  console.log(`       ${c.cyan("doctrina spec new <capability>")}`);
  console.log("");
  console.log("3. Write one delta per affected capability at");
  console.log(`   .doctrina/changes/${id}/specs/<capability>/delta.md:`);
  console.log(c.gray("       # Spec Delta — capability: <capability>"));
  console.log(c.gray("       **Operation:** ADDED | MODIFIED | REMOVED"));
  console.log(c.gray("       **Target spec on apply:** `.doctrina/specs/<capability>/spec.md`"));
  console.log(c.gray("       ---"));
  console.log(c.gray("       <EARS requirements: full spec body for ADDED, fragment for MODIFIED>"));
  console.log("");
  console.log(`4. Replace the placeholder tasks in .doctrina/changes/${id}/tasks.md`);
  console.log("   with small, checkable implementation tasks (a few hours each, max).");
  console.log("");
  console.log("5. Implement task by task, checking each box as it lands. If the");
  console.log("   prompt is genuinely ambiguous, ask the user before assuming.");
  console.log("");
  console.log(`6. ${c.cyan(`doctrina analyze ${id}`)} — fix every ✗ before applying.`);
  console.log(`7. ${c.cyan(`doctrina change apply ${id}`)}   (MODIFIED deltas are merged by hand).`);
  console.log(`8. ${c.cyan(`doctrina change archive ${id}`)}`);
  console.log(`9. ${c.cyan("doctrina validate")}, then ${c.cyan("doctrina next")} for the follow-up.`);
}

export const help = `
Usage: doctrina work "<prompt>" [--capability <cap>] [--id <id>] [--force]

Turn a brief prompt into a scaffolded change plus the work playbook the
host AI agent executes (see ADR 0005). The CLI derives a sequential
change id (NNNN-<slug>) from the prompt, opens the change folder,
records the prompt under the proposal's "## Why", ranks existing specs
by term overlap as a capability hint, and prints the ordered steps:
context → spec delta → tasks → implement → analyze → apply → archive →
validate. No natural-language interpretation happens in the CLI.

Options:
  --capability <cap>   Pin the capability instead of ranking matches
  --id <id>            Override the derived change id
  --force              Overwrite an existing change folder
`;
