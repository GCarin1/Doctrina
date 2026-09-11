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
import { recordUsage, operationOf } from "./lib/usage.js";
import { wantsJson, emitJson, captureOutput, stripAnsi, setDeprecation, deferJson, flushJson } from "./lib/json-out.js";

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

  // A flag the command does not declare is REFUSED, never ignored.
  //
  // Declaring the flags (C3) fixed the parser swallowing a positional; it
  // did not make anything CHECK the declaration, so an unrecognised flag was
  // simply dropped. On the same tree, `doctrina coverage --strict` exited 1
  // and `doctrina coverage --stricts` exited 0: the gate the operator asked
  // for never ran, and nothing said so. That is the most expensive failure a
  // gate can have, because it is indistinguishable from success — a CI job
  // with a typo in `--strict` stays green forever over a tree the gate would
  // reject (change 0082).
  //
  // Usage error, not gate failure: exit 2 (ADR 0018). Checked after --help,
  // so `doctrina <cmd> --typo --help` still explains the command instead of
  // refusing to.
  if (spec) {
    const declared = new Set([
      ...GLOBAL_FLAGS.boolean, ...GLOBAL_FLAGS.string,
      ...(spec.boolean ?? []), ...(spec.string ?? []),
    ]);
    const undeclared = [...flags.keys()].filter((f) => !declared.has(f));
    if (undeclared.length > 0) {
      const lines = [];
      for (const f of undeclared) {
        lines.push(`error: unknown flag "--${f}" for \`doctrina ${commandName}\``);
        console.error(c.red("error:") + ` unknown flag "--${f}" for \`doctrina ${commandName}\``);
        const guess = suggest(f, [...declared]);
        if (guess) {
          lines.push(`hint: did you mean \`--${guess}\`?`);
          console.error(c.gray("hint: ") + `did you mean \`--${guess}\`?`);
        }
      }
      lines.push(`hint: \`doctrina ${commandName} --help\` lists the flags it accepts`);
      console.error(c.gray("hint: ") + `\`doctrina ${commandName} --help\` lists the flags it accepts`);
      // A consumer that asked for JSON gets JSON, including when the answer
      // is "I refused" (third audit, finding 7). Change 0086 made the
      // envelope tell the truth about the exit code; the flag check runs
      // BEFORE the envelope exists, so a rejected invocation returned exit 2
      // with an empty stdout and the consumer got a parse error instead of
      // `{ok: false, exit_code: 2}`.
      if (wantsJson(flags)) {
        emitJson(operationName(positional), { stderr: lines },
          { ok: false, exitCode: EXIT.USAGE, args: positional.slice(1) });
      }
      return EXIT.USAGE;
    }
  }

  // A deprecated name keeps working and says so, once, before it runs
  // (change 0049). On stderr, so a piped stdout stays exactly what it was —
  // a warning that corrupts the output it warns about is a breaking change
  // wearing a deprecation's clothes.
  const deprecated = deprecationFor(positional);
  if (deprecated) {
    console.error(c.yellow("deprecated:") + ` this command is superseded — use ${c.cyan(deprecated.use)}`);
    console.error(c.gray(`            ${deprecated.why}; the old name still works and will be removed in a later minor.`));
    // And into the envelope, for the consumer that never sees a terminal
    // (change 0061). The prose line above stays for the one that does.
    setDeprecation({ use: deprecated.use, since: deprecated.since, why: deprecated.why });
  }

  try {
    // --json on a command that builds no payload of its own still answers in
    // JSON: its output is captured into a versioned envelope beside `ok` and
    // `exit_code`. Branch on those; the lines are for completeness (M7).
    // A module with several subcommands is native for some and not others —
    // `contract check` builds a real payload, `contract new` has nothing but
    // its prose — so `jsonNative` may be a predicate over the subcommand's
    // own arguments (change 0068).
    const jsonNative = typeof command.jsonNative === "function"
      ? command.jsonNative(positional.slice(1))
      : command.jsonNative === true;
    if (wantsJson(flags) && !jsonNative) {
      const { code, stdout, stderr } = await captureOutput(
        () => command.run(positional.slice(1), flags),
      );
      emitJson(operationName(positional), {
        stdout: stdout.map(stripAnsi),
        stderr: stderr.map(stripAnsi),
      }, { ok: code === EXIT.OK, exitCode: code, args: operationArgs(positional) });
      return code;
    }
    // The native path: hold the payload the command builds, run it, then
    // write the envelope with the code it returned — so `ok` and `exit_code`
    // say what the process says (change 0086).
    if (wantsJson(flags)) {
      deferJson();
      let code = EXIT.OK;
      try {
        code = (await command.run(positional.slice(1), flags)) ?? EXIT.OK;
      } finally {
        flushJson(code);
      }
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

// The OPERATION an invocation names, and the arguments it carries — the two
// halves the envelope's `command` field used to run together (third audit,
// finding 6). `doctrina why carteira --json` answered `"command": "why
// carteira"`, so a consumer reading that field got a different shape for
// every capability, while `next --json` documents `command`/`args` as the
// contract to branch on. The catalog is what tells a sub-operation
// (`spec list`) from an argument (`why carteira`) — shape alone cannot,
// which is the same reason `lib/usage.js` consults it.
const KNOWN_OPERATIONS = new Set(OPERATIONS.map((o) => o[0]));

function operationName(positional) {
  return operationOf(positional, KNOWN_OPERATIONS) ?? positional[0] ?? "";
}

function operationArgs(positional) {
  return positional.slice(operationName(positional).split(" ").length);
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
  // SET THE CODE; DO NOT CALL process.exit().
  //
  // When stdout is a PIPE — every `doctrina ... | less`, every agent reading
  // this CLI, every `spawnSync` in the suite — Node may not have handed the
  // bytes to the OS yet when this callback runs. `process.exit()` tears the
  // process down immediately and whatever is still buffered is simply lost.
  // Setting `exitCode` lets Node exit on its own once the work is done, and
  // flushing stdout is part of that work.
  //
  // This is not theoretical. Four tests failed on macOS with Node 20.12 and
  // on no other leg of the matrix, all of them `--concat` runs looking for
  // content near the END of a long output. The decisive one printed exactly
  // one section: `product.md` was on disk and in the pack listing, and the
  // concat output stopped before reaching it. Pipe buffer sizes differ per
  // platform, which is precisely why a truncation bug picks one and hides on
  // the others.
  //
  // `--concat` even carries the comment "Keep the pack pipeable". Losing the
  // tail of a pipe is the one way to break that promise.
  process.exitCode = code ?? 0;
});
