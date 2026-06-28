import path from "node:path";
import process from "node:process";
import { watch as fsWatch } from "node:fs";
import { exists } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import * as validate from "./validate.js";
import * as next from "./next.js";

// Continuous keep-in-sync (review 2026-06-27 passive-user feature #4): re-run
// `validate --fix` (heal drift, migrate the stamp) and reprint `doctrina next`
// whenever an artifact changes, so the index stays synced and the agent stays
// oriented without anyone invoking a command. Passive by construction. The
// pass is debounced and ignores writes to index.json (which `--fix` itself
// makes) so it never loops on its own output. `--once` runs a single pass and
// exits — the testable, scriptable form.

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  const dot = path.join(projectRoot, ".doctrina");
  if (!exists(dot)) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  if (flagBool(flags, "once", false)) {
    return pass(projectRoot);
  }

  console.log(c.bold("doctrina watch") + c.gray(" — validate --fix + next on every change. Ctrl-C to stop."));
  await pass(projectRoot);

  let timer = null;
  let running = false;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) return;
      running = true;
      console.log("");
      console.log(c.gray(`──── ${new Date().toLocaleTimeString()} change detected`));
      await pass(projectRoot);
      running = false;
    }, 300);
  };

  let watcher;
  try {
    watcher = fsWatch(dot, { recursive: true }, (_event, filename) => {
      const name = (filename ?? "").replace(/\\/g, "/");
      // Ignore the index the fix itself rewrites (would self-trigger forever).
      if (name.endsWith("index.json")) return;
      schedule();
    });
  } catch (err) {
    console.error(c.red("error:") + ` could not start the watcher: ${err.message}`);
    return 1;
  }

  // Keep the process alive until interrupted.
  return await new Promise((resolve) => {
    const stop = () => {
      if (watcher) watcher.close();
      console.log("");
      console.log(c.gray("watch stopped."));
      resolve(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
}

// One pass: heal drift, then reprint the next actions. Never throws.
async function pass(projectRoot) {
  try {
    await validate.run([], new Map([["fix", true]]));
    console.log("");
    await next.run([], new Map());
  } catch (err) {
    console.error(c.red("error:") + ` ${err.message}`);
    return 1;
  }
  return 0;
}

export const help = `
Usage: doctrina watch [--once]

Watch the .doctrina/ tree and, on every change, run \`doctrina validate
--fix\` (heal index drift, migrate the framework stamp) and reprint
\`doctrina next\` — so the index stays in sync and the agent stays oriented
without anyone invoking a command. Debounced; ignores the index.json the
fix itself rewrites. Runs until interrupted (Ctrl-C).

Options:
  --once     Run a single pass (validate --fix + next) and exit, instead of
             watching. The scriptable / testable form.
`;
