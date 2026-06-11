import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, read, relPath, walk } from "../lib/fs-ops.js";
import { c } from "../lib/colors.js";

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

  const results = [];

  // proposal.md
  const proposalPath = path.join(changeDir, "proposal.md");
  if (!isFile(proposalPath)) {
    results.push(fail("proposal.md missing"));
  } else {
    results.push(pass("proposal.md present"));
    const text = read(proposalPath);
    if (/^##\s+Why\b/m.test(text)) results.push(pass(`proposal.md has a "## Why" section`));
    else results.push(fail(`proposal.md missing "## Why" section`));
  }

  // tasks.md
  const tasksPath = path.join(changeDir, "tasks.md");
  if (!isFile(tasksPath)) {
    results.push(fail("tasks.md missing"));
  } else {
    results.push(pass("tasks.md present"));
    const text = read(tasksPath);
    if (/^\s*-\s*\[\s\]/m.test(text)) results.push(pass("tasks.md has at least one unchecked task"));
    else results.push(info("tasks.md has no unchecked tasks (already done?)"));
  }

  // design.md (optional)
  const designPath = path.join(changeDir, "design.md");
  if (isFile(designPath)) results.push(info("design.md present"));
  else results.push(info("design.md absent (optional)"));

  // Spec deltas
  const deltaFiles = walk(path.join(changeDir, "specs")).filter((p) => p.endsWith("delta.md"));
  if (deltaFiles.length === 0) {
    results.push(info("0 spec deltas (metadata-only change)"));
  } else {
    results.push(pass(`${deltaFiles.length} spec delta${deltaFiles.length === 1 ? "" : "s"}:`));
    for (const deltaPath of deltaFiles) {
      const rel = relPath(projectRoot, deltaPath);
      const text = read(deltaPath);
      const opMatch = text.match(/^\*\*Operation:\*\*\s*([A-Z]+)/m);
      const op = opMatch ? opMatch[1] : null;
      const capMatch = text.match(/^#\s+Spec Delta\s*[—-]\s*capability:\s*([a-z][a-z0-9-]*)/m);
      const cap = capMatch ? capMatch[1] : path.basename(path.dirname(deltaPath));

      if (!op) {
        results.push(fail(`  ${rel}: Operation header missing or malformed`, "  "));
        continue;
      }
      if (!["ADDED", "MODIFIED", "REMOVED"].includes(op)) {
        results.push(fail(`  ${rel}: Operation "${op}" is not one of ADDED|MODIFIED|REMOVED`, "  "));
        continue;
      }
      const targetSpec = path.join(projectRoot, ".doctrina", "specs", cap, "spec.md");
      const targetRel = relPath(projectRoot, targetSpec);
      if (op === "ADDED") {
        if (exists(targetSpec)) {
          results.push(fail(`  ${cap} (ADDED) but target ${targetRel} already exists`, "  "));
        } else {
          results.push(pass(`  ${cap} (ADDED) → ${targetRel} (new)`, "  "));
        }
      } else if (op === "MODIFIED") {
        if (!exists(targetSpec)) {
          results.push(fail(`  ${cap} (MODIFIED) but target ${targetRel} does not exist`, "  "));
        } else {
          results.push(pass(`  ${cap} (MODIFIED) → ${targetRel}`, "  "));
        }
      } else {
        if (!exists(targetSpec)) {
          results.push(fail(`  ${cap} (REMOVED) but target ${targetRel} does not exist`, "  "));
        } else {
          results.push(pass(`  ${cap} (REMOVED) → ${targetRel}`, "  "));
        }
      }
    }
  }

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

function pass(msg) {
  return { kind: "pass", line: c.green("✓ ") + msg };
}
function fail(msg) {
  return { kind: "fail", line: c.red("✗ ") + msg };
}
function info(msg) {
  return { kind: "info", line: c.gray("- ") + msg };
}

export const help = `
Usage: doctrina analyze <change-id>

Inspect a change folder before applying. Reports on proposal,
tasks, design, and each spec delta. Exits 0 when no failures, 1
otherwise. Does not modify any files.
`;
