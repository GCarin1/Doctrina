// @ts-check
import path from "node:path";
import process from "node:process";
import { isDir, relPath } from "../lib/fs-ops.js";
import { c } from "../lib/colors.js";
import { collectAnalysis } from "../lib/analysis.js";

// The findings themselves live in lib/analysis.js, where the gate map reads
// them; this command is their renderer (audit finding F7).
export { collectAnalysis } from "../lib/analysis.js";

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(positional, _flags) {
  const id = positional[0];
  if (!id) {
    console.error(c.red("error:") + " analyze requires <change-id>");
    return 2;
  }

  const projectRoot = process.cwd();
  const changeDir = path.join(projectRoot, ".doctrina", "changes", id);
  if (!isDir(changeDir)) {
    console.error(c.red("error:") + ` change "${id}" not found at ${relPath(projectRoot, changeDir)}`);
    return 1;
  }

  console.log(`analyzing ${relPath(projectRoot, changeDir)}/`);
  console.log("");

  const results = collectAnalysis(projectRoot, changeDir);
  for (const r of results) console.log(r.line);
  console.log("");

  const failed = results.filter((r) => r.kind === "fail").length;
  if (failed === 0) {
    console.log(c.green("ok") + ` ready to apply`);
  } else {
    console.log(c.red("fail") + ` ${failed} issue${failed === 1 ? "" : "s"}`);
  }
  return failed === 0 ? 0 : 1;
}

export const help = `
Usage: doctrina analyze <change-id>

Inspect a change folder before applying. Reports on proposal,
tasks, design, and each spec delta. Exits 0 when no failures, 1
otherwise. Does not modify any files.
`;
