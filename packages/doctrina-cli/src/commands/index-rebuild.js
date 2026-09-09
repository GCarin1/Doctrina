// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { collectIndexDrift } from "../lib/scan.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

const SUBCOMMANDS = ["rebuild"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "check"], string: [] };

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
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
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

export const help = `
Usage: doctrina index <subcommand>

Subcommands:
  rebuild           Regenerate .doctrina/index.json from the artifacts on
                    disk (spec headers, ADR headers, change proposals,
                    archive folders, skill frontmatter). The files are the
                    source of truth; the index is derived.
  rebuild --check   Write nothing; exit 1 with a drift summary when the
                    index no longer matches the tree. CI-friendly.

Fields with no on-disk source (project name, framework_version, product
metadata) are carried over from the existing index.
`;
