#!/usr/bin/env node
// @ts-check
import process from "node:process";
import { parseArgs } from "./lib/args.js";
import { c } from "./lib/colors.js";
import { suggest } from "./lib/suggest.js";
import { cliVersion } from "./lib/version.js";
import { surfaceHelp, OPERATIONS, deprecationFor } from "./lib/commands.js";
import { GLOBAL_FLAGS } from "./lib/flag-catalog.js";
import { EXIT, exitCodeHelp } from "./lib/exit-codes.js";
import { recordUsage } from "./lib/usage.js";
import { wantsJson, emitJson, captureOutput, stripAnsi } from "./lib/json-out.js";

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
import * as adapter from "./commands/adapter.js";
import * as triage from "./commands/triage.js";
import * as ci from "./commands/ci.js";

const COMMANDS = {
  init, spec, change, decision, validate, hooks, analyze, clarify,
  templates, skill, index: indexCmd, next, metrics, context, search,
  intake, work, coverage, verify, contract, trace,
  status, close, review, watch, why, constitution,
  prime, handoff, show, doctor, report, completion,
  intent, upgrade, adapter, triage, ci,
};

const TOP_HELP = `
Usage: doctrina <command> [options]

Commands:
${surfaceHelp()}

Global flags:
  --help, -h           Show this message (or per-command help if after a command)
  --version, -v        Print the version
  --debug              On an unexpected error, also print the stack trace

Exit codes (a contract — an agent reads these to decide what to do next):
${exitCodeHelp()}
`;

async function main(argv) {
  // `--version` is only "print the CLI version" when NO command is given.
  // With a command it is that command's flag to consume — the old global
  // intercept made `doctrina spec set x --version 0.10.0` print the CLI
  // version and exit, looking exactly like the spec's version had been set
  // (0.11.0 field-review papercut). `-v` stays global either way.
  const versionOnly = argv.every((t) => t === "--version" || t === "-v") && argv.length > 0;

  // Two passes. The first resolves only the command name, using the global
  // flags; the second re-parses with THAT command's declared flags merged in.
  //
  // One global boolean list used to serve every command, and six flags read
  // via flagBool were missing from it. An undeclared flag whose next token
  // does not start with "-" swallows that token as its value, so
  // `change new --chore ajuste-ci "Ajustar CI"` lost the id AND silently
  // ignored the flag, reporting "requires a title" for a quoted title (C3).
  // Declarations now live with the command, so a new command cannot
  // reintroduce the gap by forgetting to edit this file.
  const bootstrap = parseArgs(argv, { boolean: [...GLOBAL_FLAGS.boolean] });
  const commandModule = COMMANDS[bootstrap.positional[0]];
  const spec = commandModule?.flags;
  const { positional, flags } = parseArgs(argv, {
    boolean: [...GLOBAL_FLAGS.boolean, ...(spec?.boolean ?? [])],
    string: [...GLOBAL_FLAGS.string, ...(spec?.string ?? [])],
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
    return EXIT.USAGE;
  }

  if (flags.get("help") || flags.get("h")) {
    process.stdout.write(command.help ?? `(no help for ${commandName})\n`);
    return 0;
  }

  // A deprecated name keeps working and says so, once, before it runs
  // (change 0049). On stderr, so a piped stdout stays exactly what it was —
  // a warning that corrupts the output it warns about is a breaking change
  // wearing a deprecation's clothes.
  const deprecated = deprecationFor(positional);
  if (deprecated) {
    console.error(c.yellow("deprecated:") + ` this command is superseded — use ${c.cyan(deprecated.use)}`);
    console.error(c.gray(`            ${deprecated.why}; the old name still works and will be removed in a later minor.`));
  }

  try {
    // --json on a command that builds no payload of its own still answers in
    // JSON: its output is captured into a versioned envelope beside `ok` and
    // `exit_code`. Branch on those; the lines are for completeness (M7).
    if (wantsJson(flags) && !command.jsonNative) {
      const { code, stdout, stderr } = await captureOutput(
        () => command.run(positional.slice(1), flags),
      );
      emitJson([commandName, ...positional.slice(1)].join(" "), {
        stdout: stdout.map(stripAnsi),
        stderr: stderr.map(stripAnsi),
      }, { ok: code === EXIT.OK, exitCode: code });
      return code;
    }
    return await command.run(positional.slice(1), flags);
  } catch (err) {
    console.error(c.red("error:") + ` ${err.message}`);
    if (err.remedy) {
      console.error(c.gray("hint: ") + `run ${c.cyan(err.remedy)} first, then retry`);
    }
    if (flags.get("debug") && err.stack) {
      console.error(c.gray(err.stack));
    }
    // A typed error carries its own class (precondition vs environment).
    // An untyped throw is an unexpected failure of the work itself, which
    // is the GATE class: something is wrong here, fix it and retry (C7).
    return err.exitCode ?? EXIT.GATE;
  }
}

main(process.argv.slice(2)).then((code) => {
  // Record which operation ran, if and only if the operator asked for it
  // by setting DOCTRINA_USAGE_LOG (M8). Off by default, local file only,
  // no arguments captured, and never fatal. See lib/usage.js.
  recordUsage(
    process.argv.slice(2).filter((a) => !a.startsWith("-")),
    code,
    new Set(OPERATIONS.map((o) => o[0])),
  );
  process.exit(code ?? 0);
});
