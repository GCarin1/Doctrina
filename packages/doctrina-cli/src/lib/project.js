// @ts-check
import path from "node:path";
import { exists } from "./fs-ops.js";
import { notADoctrinaProject } from "./exit-codes.js";

// The one precondition every command shares: this is a Doctrina project.
// Six command modules carried an identical private copy of it; a lib
// operation that needs it should not have to reach into a command for the
// check (audit finding F7).
export function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
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
