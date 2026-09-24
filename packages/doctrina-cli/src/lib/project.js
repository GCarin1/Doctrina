// @ts-check
import path from "node:path";
import { exists } from "./fs-ops.js";
import { EXIT, notADoctrinaProject } from "./exit-codes.js";
import { c } from "./colors.js";
import { load } from "./index-json.js";

// The one precondition every command shares: this is a Doctrina project.
// Six command modules carried an identical private copy of it; a lib
// operation that needs it should not have to reach into a command for the
// check (audit finding F7).
export function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
}

/**
 * What this project is CALLED — the name it recorded at `init`, with the
 * directory as the fallback for a tree that has none.
 *
 * Four modules asked this privately and one of them answered differently:
 * `adapter` read the directory and never the record, so every adapter file
 * installed after `doctrina init --project-name "Minha Carteira"` greeted the
 * agent with the folder's name instead. `init --agent`, holding the name it
 * had just been given, got it right — the same templates, two callers, two
 * answers.
 *
 * Pass `index` when you already hold it; the helper then reads nothing.
 *
 * @param {string} projectRoot
 * @param {any} [index] an already-loaded index.json, when the caller has one
 */
export function projectName(projectRoot, index) {
  if (index !== undefined) return index?.project ?? path.basename(projectRoot);
  try {
    return load(projectRoot)?.project ?? path.basename(projectRoot);
  } catch {
    return path.basename(projectRoot);
  }
}

// The grammar a change id obeys: lowercase letters, digits and hyphens,
// opening on a letter or a digit — `0042-short-slug` is the shape `work`
// derives. Deliberately NOT the capability grammar, which additionally
// requires a leading letter; two rules that look alike are not one rule.
//
// It exists because `change new` had NO grammar (third audit, finding 1).
// Every other authoring command validated its argument; `change new` joined
// whatever it was given onto a path, so `change new ../../../elsewhere/evil`
// wrote a change folder OUTSIDE the project — against the `authoring` spec's
// own "shall not write outside the project working directory" — and ids like
// `0003-com espaco` reached `validate` and `index rebuild` as legitimate,
// producing a `next` action whose command could not be run.
export const CHANGE_ID = /^[a-z0-9][a-z0-9-]*$/;

export function isChangeId(id) {
  return typeof id === "string" && CHANGE_ID.test(id);
}

// A reference to an EXISTING change is looser than the id `change new`
// accepts — a project may hold a change named before that grammar — but it
// is always a folder NAME under .doctrina/changes/, never a path. Nothing
// checked that: `change archive ../../victim --force` moved the project's
// own `victim/` directory into the archive and wrote it into the ledger and
// the index (change 0196). `archive` is the archive's own folder, not a
// change.
export function isChangeRef(id) {
  return typeof id === "string" && id.length > 0 && id !== "." && id !== ".."
    && id !== "archive" && !/[\/\\\0]/.test(id);
}

// The one refusal every command that takes a change reference prints: the
// USAGE class, before anything is resolved against the filesystem.
export function refuseChangeRef(id) {
  if (isChangeRef(id)) return null;
  console.error(c.red("error:") + ` "${id}" is not a change — a change is named by its folder under .doctrina/changes/, never by a path`);
  console.error(c.gray("hint: ") + "open changes: `doctrina next`");
  return EXIT.USAGE;
}

/**
 * Resolve `segments` under `projectRoot` and refuse anything that escapes it.
 *
 * Defence in depth, deliberately separate from the grammar above: the
 * grammar is what tells the USER their id is wrong, and this is what holds
 * even when a caller forgets to ask. A path is inside when it is the root
 * itself or sits beneath it — compared after `path.resolve`, so `..`,
 * absolute arguments and symlink-free trickery all normalise first.
 *
 * Throws rather than returning a code: a caller that reached here with an
 * escaping path has a bug, and the entrypoint's catch turns a thrown error
 * into the gate class with the message intact.
 */
export function resolveWithinProject(projectRoot, ...segments) {
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, ...segments);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `refusing to write outside the project: "${path.join(...segments)}" resolves to ${target}`,
    );
  }
  return target;
}
