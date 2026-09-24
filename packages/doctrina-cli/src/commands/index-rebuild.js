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

const SUBCOMMANDS = ["rebuild"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "check", "staged"], string: [] };

export async function run(positional, flags) {
  const sub = positional[0];
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

Fields with no on-disk source (project name, framework_version, product
metadata) are carried over from the existing index.
`;
