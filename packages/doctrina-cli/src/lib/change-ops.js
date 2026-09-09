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
import { ensureDoctrinaProject, isChangeId, resolveWithinProject } from "./project.js";
import { changeEntry } from "./scan.js";
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
  // The id names a DIRECTORY, so it obeys the same grammar every other
  // authoring command enforces on its argument (third audit, finding 1).
  // Without this `change new ../../../elsewhere/evil` scaffolded outside the
  // project, and `0003-com espaco` was accepted here and then carried by
  // `validate`, `index rebuild` and `next` as a legitimate id.
  if (!isChangeId(id)) {
    console.error(c.red("error:") + ` invalid change id "${id}" (lowercase letters, digits, hyphens)`);
    console.error(c.gray("hint: ") + "ids look like `0042-short-slug`; `doctrina work \"<prompt>\"` derives one for you");
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

  // Belt and braces: the grammar above already refuses a traversing id, and
  // this holds if a future caller reaches this line another way.
  const changeDir = resolveWithinProject(projectRoot, ".doctrina", "changes", id);
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
  // No empty `specs/` here (change 0081). The directory used to be created
  // unconditionally as somewhere "ready" for deltas, and when the CLI could
  // not name a capability — a new prompt, a project whose specs do not match
  // — nothing was ever written into it. An empty directory is not an absence:
  // it says deltas live here, or lived here, and the next reader spends
  // attention checking. The delta writer creates its own path when there is
  // a delta to put in it.

  // Stamp the proposal so a chore is honest in the artifact, not just the CLI.
  if (chore) {
    const proposalPath = path.join(changeDir, "proposal.md");
    if (exists(proposalPath)) {
      const txt = read(proposalPath);
      const updated = txt.replace(/^(-\s+\*\*Affects specs:\*\*).*$/m, "$1 (none — chore)");
      if (updated !== txt) write(proposalPath, updated, { force: true });
    }
  }

  // Derive the entry from the proposal on disk rather than assembling one
  // here: a field the deriver knows about and this writer does not is index
  // drift the moment the change is opened (change 0076 — that is exactly what
  // `lane` did). One constructor, in `scan.js`, for one record shape.
  reindexChange(projectRoot, id, date);

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

/**
 * Register — or re-derive — one open change's index entry from its proposal.
 *
 * `work` writes the proposal in two passes: `changeNew` scaffolds it, then the
 * command stamps the lane it classified and the specs it pinned. Indexing at
 * the end of the FIRST pass reads a proposal that is not finished yet, which
 * is why every `doctrina work` used to be followed by a `validate` error and
 * an `index rebuild` nobody asked for. Calling this again after the stamping
 * costs one file write and makes the tree honest on the next command.
 *
 * @param {string} projectRoot
 * @param {string} id    The change id (its directory name).
 * @param {string} [date] Fallback for a proposal carrying no Date header.
 */
export function reindexChange(projectRoot, id, date = today()) {
  const proposalPath = path.join(projectRoot, ".doctrina", "changes", id, "proposal.md");
  const proposal = isFile(proposalPath) ? read(proposalPath) : "";
  const index = idx.load(projectRoot);
  const prev = index.artifacts.changes.find((ch) => ch.id === id) ?? null;
  index.artifacts.changes = index.artifacts.changes.filter((ch) => ch.id !== id);
  index.artifacts.changes.push(changeEntry(proposal, id, prev, date));
  idx.touch(index, date);
  idx.save(projectRoot, index);
}
