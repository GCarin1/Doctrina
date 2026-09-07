// @ts-check
// Scaffolding a change folder.
//
// `work` opens a change as its first act and called into `commands/change.js`
// to do it (audit finding F7). Creating the folder is an OPERATION over the
// tree, not a rendering of the `change` command, so both entry points perform
// it from here.
import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, lineCount, mkdirp, move, read, relPath, remove, walk, write } from "./fs-ops.js";
import { locateTemplatesDir, loadTemplateTree, materialiseEntry } from "./templates.js";
import * as idx from "./index-json.js";
import { today } from "./dates.js";
import { flagBool, flagString } from "./args.js";
import { c } from "./colors.js";
import { ensureDoctrinaProject } from "./project.js";
export function changeNew(args, flags) {
  const id = args[0];
  const title = args.slice(1).join(" ").trim();
  if (!id) {
    console.error(c.red("error:") + " change new requires <id> and \"<title>\"");
    return 2;
  }
  if (!title) {
    console.error(c.red("error:") + " change new requires a title (quote it if it contains spaces)");
    return 2;
  }

  const force = flagBool(flags, "force", false);
  // A chore is a spec-less change (infra / docs / build / migration) — review
  // G9. It runs the full proposal → apply → archive → ledger lifecycle (so the
  // history shows it) without forcing a fake spec delta. The empty specs/ dir
  // is kept so `change apply`'s zero-delta path flips it to applied unchanged.
  const chore = flagBool(flags, "chore", false) || flagBool(flags, "no-spec", false);
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (exists(changeDir) && !force) {
    console.error(c.red("error:") + ` change "${id}" already exists at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const date = today();
  const tokens = { CHANGE_ID: id, CHANGE_TITLE: title, DATE: date, CAPABILITY: "" };

  // design.md is opt-in (--design): in practice it scaffolded on every change
  // and stayed empty — nine changes out of nine in the 0.11.0 field review. A
  // change that needs a design doc asks for one; the rest stop carrying a
  // blank file through apply/archive/ledger.
  const wantDesign = flagBool(flags, "design", false);
  const tree = loadTemplateTree(templatesDir, "change");
  for (const entry of tree) {
    if (entry.relativePath === "spec-delta.md.template") continue;
    if (entry.relativePath === "design.md.template" && !wantDesign) continue;
    const written = materialiseEntry(entry, changeDir, tokens, { force });
    console.log(c.green("created") + ` ${relPath(projectRoot, written)}`);
  }
  mkdirp(path.join(changeDir, "specs"));

  // Stamp the proposal so a chore is honest in the artifact, not just the CLI.
  if (chore) {
    const proposalPath = path.join(changeDir, "proposal.md");
    if (exists(proposalPath)) {
      const txt = read(proposalPath);
      const updated = txt.replace(/^(-\s+\*\*Affects specs:\*\*).*$/m, "$1 (none — chore)");
      if (updated !== txt) write(proposalPath, updated, { force: true });
    }
  }

  const index = idx.load(projectRoot);
  idx.addChange(index, { id, title, path: `.doctrina/changes/${id}`, status: "proposed", opened: date });
  idx.touch(index, date);
  idx.save(projectRoot, index);

  console.log("");
  if (chore) {
    console.log(c.bold("Chore opened.") + " No spec deltas expected — implement, check the tasks, then " +
      c.cyan(`doctrina change apply ${id}`) + " and " + c.cyan(`doctrina change archive ${id}`) + ".");
  } else {
    console.log(c.bold("Change opened.") + " Add spec deltas under " +
      c.cyan(`.doctrina/changes/${id}/specs/<capability>/delta.md`));
  }
  return 0;
}
