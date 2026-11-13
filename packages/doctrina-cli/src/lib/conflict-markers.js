// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";

// A MERGE THAT STOPPED INSIDE AN ARTIFACT (seventh audit, change 0250).
//
// Two branches each added a requirement to the same section of a spec, the
// merge stopped with `<<<<<<<` / `=======` / `>>>>>>>` in the file, and
// `validate` answered "0 errors": the markers are not headers, bullets or
// criteria, so no check had a reason to look at them. A spec is read as
// written — by the agent, by `context`, by `apply` — markers and both
// halves included.

/**
 * The line of the first conflict marker, or null. A file is conflicted when
 * it holds an opening AND a closing marker at the start of a line, outside a
 * fenced block (a document may show the markers as an example).
 */
export function conflictMarkerLine(text) {
  let fenced = false;
  let opened = null;
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^[ \t]*(```|~~~)/.test(lines[i])) fenced = !fenced;
    if (fenced) continue;
    if (opened === null && /^<{7}( |$)/.test(lines[i])) opened = i + 1;
    else if (opened !== null && /^>{7}( |$)/.test(lines[i])) return opened;
  }
  return null;
}

/** The Markdown a session reads as current truth: the hub, the product, specs, decisions, skills, contracts, open changes. */
export function livingArtifacts(projectRoot) {
  const root = path.join(projectRoot, ".doctrina");
  const out = [path.join(projectRoot, "AGENTS.md"), path.join(root, "product.md")].filter(isFile);
  for (const dir of ["specs", "decisions", "skills", "contracts"]) {
    out.push(...walk(path.join(root, dir)).filter((f) => f.endsWith(".md")));
  }
  const changes = path.join(root, "changes");
  if (isDir(changes)) {
    for (const entry of readdirSync(changes)) {
      if (entry === "archive" || entry.startsWith(".")) continue;
      out.push(...walk(path.join(changes, entry)).filter((f) => f.endsWith(".md")));
    }
  }
  return out;
}

/**
 * Every living artifact a merge stopped in.
 * @returns {{ file: string, line: number }[]}
 */
export function conflictedArtifacts(projectRoot) {
  const out = [];
  for (const file of livingArtifacts(projectRoot)) {
    const line = conflictMarkerLine(read(file));
    if (line !== null) out.push({ file, line });
  }
  return out;
}
