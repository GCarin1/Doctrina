// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { collectIndexDrift, collectStagedIndexDrift } from "../lib/scan.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { planSkillExport, applySkillExport } from "../lib/skill-export.js";
import { mergeIndex } from "../lib/index-merge.js";
import { readFileSync, writeFileSync } from "node:fs";

const SUBCOMMANDS = ["rebuild", "merge"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "check", "staged"], string: [] };

export async function run(positional, flags) {
  const sub = positional[0];
  if (sub === "merge") return merge(positional.slice(1));
  if (sub !== "rebuild") {
    console.error(c.red("error:") + ` unknown index subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina index ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  return rebuild(flags);
}

function rebuild(flags) {
  const check = flagBool(flags, "check", false);
  const staged = flagBool(flags, "staged", false);
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  if (staged) {
    if (!check) {
      console.error(c.red("error:") + " --staged reads the commit, so it can only check; it never writes");
      console.error(c.gray("hint: ") + "run `doctrina index rebuild --check --staged`");
      return 2;
    }
    return checkStaged(projectRoot);
  }

  const state = collectIndexDrift(projectRoot);
  if (state.unreadable) {
    if (check) {
      console.error(c.red("error:") + ` ${state.unreadable}`);
      return 1;
    }
    console.log(c.yellow("warn:") + ` ${state.unreadable} — rebuilding from scratch`);
  }

  // The skills, where the agents look for them (change 0212). Exported on
  // every rebuild; under --check a stale export is a NOTE, never a failure —
  // the index gate is about the index, and a project upgrading Doctrina must
  // not go red in CI before its first rebuild.
  const exportPlan = planSkillExport(projectRoot);
  const exportChanges = exportPlan.writes.length + exportPlan.removes.length;
  if (exportChanges > 0) {
    if (check) {
      console.log(c.gray("note:  ") + `${exportChanges} skill export${exportChanges === 1 ? " is" : "s are"} out of date — ` +
        "`doctrina index rebuild` regenerates them");
    } else {
      applySkillExport(projectRoot, exportPlan);
      for (const w of exportPlan.writes) console.log(c.green("export ") + ` ${w.rel}`);
      for (const r of exportPlan.removes) console.log(c.green("removed") + ` ${r} (its skill is gone)`);
    }
  }

  if (state.ok) {
    console.log(c.green("ok") + " index.json matches the tree (nothing to do)");
    return 0;
  }

  for (const line of state.drift) console.log((check ? c.yellow("drift: ") : c.gray("sync:  ")) + line);

  if (check) {
    console.log("");
    console.log(c.red("fail") + ` index.json has drifted from the tree (${state.drift.length} difference${state.drift.length === 1 ? "" : "s"})`);
    console.log(c.gray("hint: ") + "run `doctrina index rebuild` to regenerate it");
    return 1;
  }

  const derived = state.derived;
  derived.last_updated = today();
  idx.save(projectRoot, derived);
  const a = derived.artifacts;
  console.log("");
  console.log(c.green("rebuilt") + ` .doctrina/index.json — ${a.specs.length} specs, ${a.decisions.length} decisions, ` +
    `${a.changes.length} open changes, ${a.changes_archive.length} archived, ${a.skills.length} skills`);
  return 0;
}

// The merge driver git calls for `.doctrina/index.json` (change 0242):
// `doctrina index merge %O %A %B`. It writes the merged index over <ours>
// and exits 0, which is how a driver tells git there is nothing to resolve.
// A side that is not JSON is the one case it leaves to git, with exit 1.
function merge(args) {
  const [basePath, oursPath, theirsPath] = args;
  if (!basePath || !oursPath || !theirsPath) {
    console.error(c.red("error:") + " index merge takes three files: <base> <ours> <theirs>");
    console.error(c.gray("hint: ") + "git calls it as a merge driver — `doctrina hooks install` sets it up");
    return 2;
  }
  const load = (/** @type {string} */ file, /** @type {string} */ side) => {
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      if (side === "base") return {};
      throw new Error(`cannot read the ${side} index at ${file}`);
    }
    if (text.trim() === "") return {};
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`the ${side} index is not valid JSON (${err.message})`);
    }
  };
  let merged;
  try {
    merged = mergeIndex(load(basePath, "base"), load(oursPath, "ours"), load(theirsPath, "theirs"));
  } catch (err) {
    console.error(c.red("error:") + ` ${err.message} — left for a manual merge; \`doctrina index rebuild\` derives it from the tree afterwards`);
    return 1;
  }
  writeFileSync(oursPath, JSON.stringify(merged, null, 2) + "\n");
  return 0;
}

// The drift check, asked of what git will record. `index.json` is derived
// from the WHOLE tree, so it cannot describe a subset of it: stage part of
// `.doctrina/` and the index riding along names artifacts the commit does
// not carry. Every other gate reads the working tree, where those artifacts
// are still sitting, so none of them can see it.
function checkStaged(projectRoot) {
  const state = collectStagedIndexDrift(projectRoot);
  if (!state.applicable) {
    console.log(c.green("ok") + ` nothing to check — ${state.reason}`);
    return 0;
  }
  if (state.ok) {
    console.log(c.green("ok") + " the staged index matches the staged tree");
    return 0;
  }
  if (state.reason) {
    console.error(c.red("error:") + ` ${state.reason}`);
    return 1;
  }
  for (const p of state.missing) {
    console.log(c.yellow("staged: ") + `${p} — named by the staged index, absent from the commit`);
  }
  for (const p of state.unindexed) {
    console.log(c.yellow("staged: ") + `${p} — in the commit, absent from the staged index`);
  }
  const n = state.missing.length + state.unindexed.length;
  console.log("");
  console.log(c.red("fail") + ` the staged index does not describe this commit (${n} difference${n === 1 ? "" : "s"})`);
  console.log(c.gray("hint: ") + "stage the artifacts above with the index, or unstage the index — "
    + "index.json is derived from the whole tree, so a partial commit of .doctrina/ cannot carry a matching one");
  return 1;
}

export const help = `
Usage: doctrina index <subcommand>

Subcommands:
  merge <base> <ours> <theirs>
                    The merge driver git runs for index.json once
                    \`doctrina hooks install\` has set it up: two branches
                    that each closed a change merge as lists of artifacts,
                    so the file never stops a merge with conflict markers.
                    Writes the result over <ours>.
  rebuild           Regenerate .doctrina/index.json from the artifacts on
                    disk (spec headers, ADR headers, change proposals,
                    archive folders, skill frontmatter). The files are the
                    source of truth; the index is derived.
  rebuild --check   Write nothing; exit 1 with a drift summary when the
                    index no longer matches the tree. CI-friendly.
  rebuild --check --staged
                    Ask the same question of the COMMIT rather than the
                    disk: every artifact the staged index names must be in
                    the commit, and every staged artifact must be in the
                    index. A partial commit of .doctrina/ cannot satisfy
                    both, because the index is derived from the whole tree.
                    Exits 0 when nothing relevant is staged.

Every rebuild also exports .doctrina/skills/ as SKILL.md folders where the
agents discover skills on their own: .agents/skills/ (Cursor, Codex) and,
with the claude adapter installed, .claude/skills/. The exports are marked
as generated; edit the source. Under --check a stale export is a note only.

Fields with no on-disk source (project name, framework_version, product
metadata) are carried over from the existing index.
`;
