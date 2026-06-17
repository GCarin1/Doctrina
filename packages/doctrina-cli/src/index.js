#!/usr/bin/env node
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parseArgs } from "./lib/args.js";
import { c } from "./lib/colors.js";
import { suggest } from "./lib/suggest.js";

import * as init from "./commands/init.js";
import * as spec from "./commands/spec.js";
import * as change from "./commands/change.js";
import * as decision from "./commands/decision.js";
import * as validate from "./commands/validate.js";
import * as hooks from "./commands/hooks.js";
import * as analyze from "./commands/analyze.js";
import * as clarify from "./commands/clarify.js";
import * as templates from "./commands/templates.js";
import * as skill from "./commands/skill.js";
import * as indexCmd from "./commands/index-rebuild.js";
import * as next from "./commands/next.js";
import * as metrics from "./commands/metrics.js";
import * as context from "./commands/context.js";
import * as search from "./commands/search.js";
import * as intake from "./commands/intake.js";
import * as work from "./commands/work.js";
import * as coverage from "./commands/coverage.js";
import * as verify from "./commands/verify.js";
import * as contract from "./commands/contract.js";

const COMMANDS = {
  init, spec, change, decision, validate, hooks, analyze, clarify,
  templates, skill, index: indexCmd, next, metrics, context, search,
  intake, work, coverage, verify, contract,
};

const TOP_HELP = `
Usage: doctrina <command> [options]

Commands:
  init                 Scaffold AGENTS.md and .doctrina/ in the current directory
  intake               Store the full project description; print the bootstrap playbook
  work                 Brief prompt -> scaffolded change + guided work playbook
  spec new             Create a new capability spec (--bug for bug-shape)
  spec list            List specs with version, status, and size
  change new           Open a change proposal
  change apply         Apply spec deltas (ADDED/REMOVED auto, MODIFIED manual)
  change archive       Archive an applied change
  change diff          Preview spec deltas (line diff for MODIFIED)
  contract new         Own the integration surface (ports, env, interfaces)
  contract check       Verify port collisions, env drift, referenced specs
  decision new         Create the next sequentially numbered ADR
  decision accept      Flip a proposed ADR to accepted
  decision supersede   Create a new ADR that supersedes an existing one
  decision list        List ADRs with status, date, and title
  skill new            Scaffold an on-demand procedural memory skill
  skill list           List skills with their descriptions
  skill sync           Mirror skill frontmatter descriptions into index.json
  analyze              Inspect a change folder before applying
  clarify              Smell-test a Markdown file for ambiguity (--all for the tree)
  context              Print the context pack for a task in read order
  search               Search the artifact tree, grouped by category
  validate             Run schema and structural checks
  coverage             Report acceptance criteria with linked evidence (--strict gates)
  verify               Run project-declared typecheck/test/build checks (the real gate)
  templates list       List the templates shipped by the installed CLI
  templates check      Compare the project against the recommended template shape
  hooks install        Install the pre-commit hook
  index rebuild        Regenerate index.json from the artifacts on disk
  next                 Print the recommended next workflow actions
  metrics              Local git-derived adoption metrics (no network)

Global flags:
  --help, -h           Show this message (or per-command help if after a command)
  --version, -v        Print the version
`;

async function main(argv) {
  const { positional, flags } = parseArgs(argv, {
    boolean: ["help", "h", "version", "v", "force", "non-interactive", "check", "save", "bug", "write", "all", "concat", "archive", "strict", "list", "init"],
  });

  if (flags.get("version") || flags.get("v")) {
    console.log(readVersion());
    return 0;
  }

  if (positional.length === 0) {
    process.stdout.write(TOP_HELP);
    return 0;
  }

  const commandName = positional[0];
  const command = COMMANDS[commandName];
  if (!command) {
    console.error(c.red("error:") + ` unknown command "${commandName}"`);
    const guess = suggest(commandName, Object.keys(COMMANDS));
    if (guess) {
      console.error(c.gray("hint: ") + `did you mean \`doctrina ${guess}\`?`);
    } else {
      console.error(c.gray("hint: ") + "try `doctrina --help` for the command surface");
    }
    return 2;
  }

  if (flags.get("help") || flags.get("h")) {
    process.stdout.write(command.help ?? `(no help for ${commandName})\n`);
    return 0;
  }

  try {
    return await command.run(positional.slice(1), flags);
  } catch (err) {
    console.error(c.red("error:") + ` ${err.message}`);
    if (flags.get("debug") && err.stack) {
      console.error(c.gray(err.stack));
    }
    return 1;
  }
}

function readVersion() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.resolve(here, "..", "package.json");
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0));
