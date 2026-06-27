import path from "node:path";
import process from "node:process";
import { chmodSync } from "node:fs";
import { exists, mkdirp, read, relPath, write } from "../lib/fs-ops.js";
import { locateTemplatesDir } from "../lib/templates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["install"];

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

  if (!exists(path.join(projectRoot, ".git"))) {
    console.error(c.red("error:") + " not a git repository (no .git/ in cwd)");
    return 1;
  }

  const hooksDir = path.join(projectRoot, ".git", "hooks");
  mkdirp(hooksDir);

  const target = path.join(hooksDir, "pre-commit");
  if (exists(target) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, target)} already exists (pass --force to overwrite)`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const tplPath = path.join(templatesDir, "hooks", "pre-commit.sample");
  const body = read(tplPath);
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

Install the Doctrina pre-commit hook into .git/hooks/pre-commit.
The hook runs \`doctrina validate --fix\`: it regenerates index.json
from the tree (healing the most common gate failure — a hand-edited
header that drifted the index — and re-staging the repaired index)
and still blocks the commit on errors a rebuild cannot heal. Edit the
installed hook freely; to gate without auto-repair, swap the line for a
bare \`doctrina validate\`.

Options:
  --force    Overwrite an existing pre-commit hook
`;
