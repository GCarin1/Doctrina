#!/usr/bin/env node
// @ts-check
import process from "node:process";
import { parseArgs } from "./lib/args.js";
import { c } from "./lib/colors.js";
import { suggest } from "./lib/suggest.js";
import { cliVersion } from "./lib/version.js";
import { surfaceHelp, OPERATIONS, deprecationFor, removalFor } from "./lib/commands.js";
import { GLOBAL_FLAGS } from "./lib/flag-catalog.js";
import { EXIT, exitCodeHelp } from "./lib/exit-codes.js";
import { recordUsage, operationOf } from "./lib/usage.js";
import { wantsJson, emitJson, captureOutput, stripAnsi, setDeprecation, deferJson, flushJson } from "./lib/json-out.js";


// Each command is loaded when it is the one invoked (fifth audit, change
// 0236): the 39 static imports cost ~150 ms before any command ran, and
// `workspace guard` runs on EVERY MCP call an agent makes — a Playwright
// session's hundred clicks paid it a hundred times.
/** @type {Record<string, () => Promise<any>>} */
const COMMANDS = {
  init: () => import("./commands/init.js"),
  spec: () => import("./commands/spec.js"),
  change: () => import("./commands/change.js"),
  decision: () => import("./commands/decision.js"),
  validate: () => import("./commands/validate.js"),
  hooks: () => import("./commands/hooks.js"),
  analyze: () => import("./commands/analyze.js"),
  clarify: () => import("./commands/clarify.js"),
  templates: () => import("./commands/templates.js"),
  skill: () => import("./commands/skill.js"),
  index: () => import("./commands/index-rebuild.js"),
  next: () => import("./commands/next.js"),
  metrics: () => import("./commands/metrics.js"),
  context: () => import("./commands/context.js"),
  search: () => import("./commands/search.js"),
  intake: () => import("./commands/intake.js"),
  work: () => import("./commands/work.js"),
  coverage: () => import("./commands/coverage.js"),
  verify: () => import("./commands/verify.js"),
  contract: () => import("./commands/contract.js"),
  trace: () => import("./commands/trace.js"),
  status: () => import("./commands/status.js"),
  close: () => import("./commands/close.js"),
  review: () => import("./commands/review.js"),
  watch: () => import("./commands/watch.js"),
  why: () => import("./commands/why.js"),
  prime: () => import("./commands/prime.js"),
  handoff: () => import("./commands/handoff.js"),
  show: () => import("./commands/show.js"),
  doctor: () => import("./commands/doctor.js"),
  report: () => import("./commands/report.js"),
  completion: () => import("./commands/completion.js"),
  intent: () => import("./commands/intent.js"),
  upgrade: () => import("./commands/upgrade.js"),
  adapter: () => import("./commands/adapter.js"),
  triage: () => import("./commands/triage.js"),
  ci: () => import("./commands/ci.js"),
  workspace: () => import("./commands/workspace.js"),
  delivery: () => import("./commands/delivery.js"),
};

const TOP_HELP = `Usage: doctrina <command> [options]      (\`doctrina <command> --help\` for its flags)

${surfaceHelp()}

Global flags: --help/-h (this, or a command's own) · --version/-v · --debug (stack traces)
Exit codes (a contract — an agent reads these to decide what to do next):
${exitCodeHelp()}
`;

async function main(argv) {
  // The MCP guard's own door (fifth audit, change 0236): it answers before
  // every tool call an agent makes, so it loads the guard and its registry
  // reader only. `--help` and `--json` take the ordinary path.
  if (argv[0] === "workspace" && argv[1] === "guard" && !argv.some((a) => /^(--help|-h|--json|--debug)$/.test(a))) {
    const at = argv.indexOf("--hook");
    const hook = at >= 0 ? argv[at + 1] : argv.find((a) => a.startsWith("--hook="))?.slice("--hook=".length);
    const { runGuard } = await import("./lib/workspace-guard.js");
    return runGuard(hook);
  }
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
  const loader = Object.hasOwn(COMMANDS, bootstrap.positional[0] ?? "") ? COMMANDS[bootstrap.positional[0]] : null;
  const commandModule = loader ? await loader() : null;
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
  const command = commandName === bootstrap.positional[0] ? commandModule
    : (Object.hasOwn(COMMANDS, commandName) ? await COMMANDS[commandName]() : null);
  const removed = removalFor(positional);
  if (removed) {
    const name = removed === removalFor([commandName]) ? commandName : positional.slice(0, 2).join(" ");
    console.error(c.red("error:") + ` \`doctrina ${name}\` was removed in ${removed.since}`);
    console.error(c.gray("hint: ") + `use \`${removed.use}\` — it prints what the removed command printed`);
    if (wantsJson(flags)) {
      emitJson(operationName(positional), { stderr: [`error: \`doctrina ${name}\` was removed in ${removed.since}`, `hint: use \`${removed.use}\``] },
        { ok: false, exitCode: EXIT.USAGE, args: positional.slice(1) });
    }
    return EXIT.USAGE;
  }
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
      const { code, stdout, stderr, error } = await captureOutput(
        () => command.run(positional.slice(1), flags),
      );
      emitJson(operationName(positional), {
        stdout: stdout.map(stripAnsi),
        stderr: stderr.map(stripAnsi),
        ...(error ? { error: String(error.message ?? error) } : {}),
      }, { ok: code === EXIT.OK, exitCode: code, args: operationArgs(positional) });
      return code;
    }
    // The native path: hold the payload the command builds, run it, then
    // write the envelope with the code it returned — so `ok` and `exit_code`
    // say what the process says (change 0086).
    if (wantsJson(flags)) {
      deferJson();
      let code = EXIT.OK;
      let thrown = null;
      try {
        code = (await command.run(positional.slice(1), flags)) ?? EXIT.OK;
      } catch (err) {
        thrown = err;
        code = err.exitCode ?? EXIT.GATE;
      }
      // A native command that failed before building its payload still
      // answers in JSON (third audit, change 0234): "not a Doctrina project"
      // or an unknown delivery printed English only, and a loop parsing the
      // payload read nothing at all.
      if (!flushJson(code)) {
        emitJson(operationName(positional), {
          error: thrown ? String(thrown.message) : "the command stopped before it built its payload — stderr says why",
          ...(thrown?.remedy ? { remedy: thrown.remedy } : {}),
        }, { ok: code === EXIT.OK, exitCode: code, args: operationArgs(positional) });
      }
      if (thrown) await reportError(thrown, flags);
      return code;
    }
    return await command.run(positional.slice(1), flags);
  } catch (err) {
    return await reportError(err, flags);
  }
}

/** The human report of a thrown error, and the exit class it carries. */
async function reportError(err, flags) {
  console.error(c.red("error:") + ` ${err.message}`);
  // A clone of a shadowed repository is not a project to init (change 0234).
  // Loaded only on this error path, like the commands (change 0236).
  const view = /^not a Doctrina project/.test(String(err.message)) ? await import("./lib/workspace-view.js") : null;
  const clone = view ? view.shadowedCloneAt(process.cwd()) : null;
  if (clone) {
    console.error(c.gray("hint: ") + (clone.same
      ? `this repository is the workspace's shadowed "${clone.name}" and its links are missing; never \`doctrina init\` here — link them again: ${c.cyan(view?.attachCommand(clone, process.cwd()))}`
      : `this repository is the workspace's shadowed "${clone.name}" (registered at ${clone.path}); never \`doctrina init\` here — to work from this clone, link its context from the workspace: ${c.cyan(view?.attachCommand(clone, process.cwd()))}`));
  } else if (err.remedy) {
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
