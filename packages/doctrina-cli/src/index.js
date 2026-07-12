#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "./lib/args.js";
import { c } from "./lib/colors.js";
import { suggest } from "./lib/suggest.js";
import { cliVersion } from "./lib/version.js";
import { surfaceHelp } from "./lib/commands.js";

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
import * as trace from "./commands/trace.js";
import * as status from "./commands/status.js";
import * as close from "./commands/close.js";
import * as review from "./commands/review.js";
import * as watch from "./commands/watch.js";
import * as why from "./commands/why.js";
import * as constitution from "./commands/constitution.js";
import * as prime from "./commands/prime.js";
import * as handoff from "./commands/handoff.js";
import * as show from "./commands/show.js";
import * as doctor from "./commands/doctor.js";
import * as report from "./commands/report.js";
import * as completion from "./commands/completion.js";
import * as intent from "./commands/intent.js";
import * as upgrade from "./commands/upgrade.js";

const COMMANDS = {
  init, spec, change, decision, validate, hooks, analyze, clarify,
  templates, skill, index: indexCmd, next, metrics, context, search,
  intake, work, coverage, verify, contract, trace,
  status, close, review, watch, why, constitution,
  prime, handoff, show, doctor, report, completion,
  intent, upgrade,
};

const TOP_HELP = `
Usage: doctrina <command> [options]

Commands:
${surfaceHelp()}

Global flags:
  --help, -h           Show this message (or per-command help if after a command)
  --version, -v        Print the version
`;

async function main(argv) {
  // `--version` is only "print the CLI version" when NO command is given.
  // With a command it is that command's flag to consume — the old global
  // intercept made `doctrina spec set x --version 0.10.0` print the CLI
  // version and exit, looking exactly like the spec's version had been set
  // (0.11.0 field-review papercut). `-v` stays global either way.
  const versionOnly = argv.every((t) => t === "--version" || t === "-v") && argv.length > 0;
  const { positional, flags } = parseArgs(argv, {
    boolean: ["help", "h", "v", "force", "non-interactive", "check", "save", "bug", "write", "all", "concat", "archive", "strict", "list", "init", "fix", "once", "clean", "json"],
  });

  if (versionOnly || flags.get("v") === true) {
    console.log(cliVersion());
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

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0));
