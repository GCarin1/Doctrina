// @ts-check
import path from "node:path";
import process from "node:process";
import { chmodSync } from "node:fs";
import { exists, mkdirp, read, relPath, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { EXIT } from "../lib/exit-codes.js";
import { writeAttributes, configureDriver, configuredDriver } from "../lib/merge-setup.js";
import { shadowRootOf } from "../lib/workspace.js";
import { gitPathOf, repoPrefix } from "../lib/git.js";

const SUBCOMMANDS = ["install"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "force"], string: [] };

export async function run(positional, flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown hooks subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina hooks ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }

  const force = flagBool(flags, "force", false);
  const projectRoot = process.cwd();

  // Asked of git, not of `.git/` (seventh audit, change 0250). In a worktree
  // and in a submodule `.git` is a file, so `mkdir .git/hooks` crashed with
  // ENOTDIR after the attributes were already written; and a project in a
  // subfolder of its repository has no `.git` beside it at all, so it was
  // told to `git init` inside a repository — while `doctor` kept sending it
  // back here.
  const prefix = repoPrefix(projectRoot);
  const hooksDir = prefix === null ? null : gitPathOf(projectRoot, "hooks");
  if (prefix === null || hooksDir === null) {
    // A PRECONDITION, not a gate: nothing was measured and found wanting,
    // the place to put the hook simply does not exist yet. Class 1 told an
    // agent to fix its work and retry the same command, which never clears.
    console.error(c.red("error:") + " not a git repository — git does not answer for this folder");
    console.error(c.gray("hint: ") + "run `git init` here, then `doctrina hooks install`");
    return EXIT.PRECONDITION;
  }

  // The CLI that installed this, pinned by path (change 0116). `.git/` is
  // local to the clone, so an absolute path is the right thing to write;
  // a bare `doctrina` ran whichever release was on the PATH — a global
  // 0.15.0 under a 0.15.1 tree rewrote the stamp backwards on every commit.
  // `DOCTRINA=` in the environment overrides it for the hook.
  const entry = path.resolve(here, "..", "index.js").replaceAll("\\", "/");
  const bin = `node \"${entry}\"`;

  // How the artifacts merge (change 0242). Before the hook, and whatever
  // becomes of it: a pre-commit hook somebody else owns is no reason for
  // two branches to stop on index.json. A shadowed repository keeps its
  // `.doctrina/` out of its own git, so there is nothing of it to merge here.
  if (shadowRootOf(projectRoot) === null) {
    const added = writeAttributes(projectRoot);
    if (added > 0) console.log(c.green("wrote") + ` .gitattributes — ${added} line${added === 1 ? "" : "s"}: index.json merges as data, the ledger as a list (commit it)`);
    const before = configuredDriver(projectRoot);
    const command = `node "${entry}"`;
    if (before !== `${command} index merge %O %A %B`) {
      if (configureDriver(projectRoot, command)) {
        console.log(c.green("set") + "   the index merge driver in this clone's git config (every clone runs `doctrina hooks install` once)");
      } else {
        console.log(c.yellow("warn:") + " git refused the merge driver; two branches that close changes will stop on index.json — `doctrina index rebuild` resolves it");
      }
    }
  }

  mkdirp(hooksDir);

  const target = path.join(hooksDir, "pre-commit");
  if (exists(target) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, target)} already exists (pass --force to overwrite)`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const tplPath = path.join(templatesDir, "hooks", "pre-commit.sample");
  let body = substitute(read(tplPath), { DOCTRINA_BIN: bin });
  // git runs a hook from the top of the repository. A project that lives
  // below it is entered first, or `validate` would answer for a folder that
  // is not a Doctrina project.
  if (prefix !== "") {
    body = body.replace(/^DOCTRINA=/m, `# This Doctrina project lives below the repository root.\ncd "${prefix}" || exit 1\n\nDOCTRINA=`);
  }
  write(target, body, { force: true });
  chmodSync(target, 0o755);
  console.log(c.green("installed") + ` ${relPath(projectRoot, target)}`);
  console.log(`The hook runs ${c.cyan("doctrina validate --fix")} before each commit:`);
  console.log(c.gray("  it rebuilds index.json from the tree (healing drift, re-staging it)"));
  console.log(c.gray("  and still blocks the commit on errors a rebuild cannot heal."));
  return 0;
}

export const help = `
Usage: doctrina hooks install [--force]

Set the repository up for commits and merges:

  - .gitattributes gains two lines (commit them): index.json merges through
    \`doctrina index merge\`, as a list of artifacts, and the ledger through
    git's own \`union\`, so two branches that each closed a change merge
    without conflict markers in either file;
  - this clone's git config gains the index merge driver, pinned to the CLI
    that installed it — every clone runs \`doctrina hooks install\` once;
  - .git/hooks/pre-commit gains the Doctrina hook.

The hook runs \`doctrina validate --fix\`: it regenerates index.json
from the tree (healing the most common gate failure — a hand-edited
header that drifted the index — and re-staging the repaired index)
and still blocks the commit on errors a rebuild cannot heal. Edit the
installed hook freely; to gate without auto-repair, swap the line for a
bare \`doctrina validate\`.

Options:
  --force    Overwrite an existing pre-commit hook
`;
