// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// THE HELP LISTS EVERY SUBCOMMAND (change 0228).
//
// `delivery tick` and `workspace tool|guard` shipped with a help body that
// described them under a Usage line that left them out: the first line a
// reader sees named a command set smaller than the one the dispatcher
// accepts. A Usage line that enumerates its subcommands must enumerate all
// of them, and the body must describe each one.

const here = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.resolve(here, "..", "src", "commands");

test("a Usage line that enumerates subcommands names every one the command dispatches", () => {
  const drift = [];
  for (const file of readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
    const src = readFileSync(path.join(commandsDir, file), "utf8");
    const declared = src.match(/const SUBCOMMANDS = \[([^\]]*)\]/);
    if (!declared) continue;
    const subs = [...declared[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const usage = src.match(/Usage: doctrina [\w-]+ <([a-z|-]+)>/);
    if (usage && usage[1] !== "subcommand") {
      const listed = usage[1].split("|");
      const missing = subs.filter((s) => !listed.includes(s));
      const extra = listed.filter((s) => !subs.includes(s));
      if (missing.length || extra.length) drift.push(`${file}: Usage misses [${missing}] lists unknown [${extra}]`);
    }
    const help = src.slice(src.indexOf("export const help"));
    for (const s of subs) {
      const described = new RegExp(`(^|\\n)\\s+${s}\\b`).test(help)       // an indented entry
        || new RegExp(`doctrina [\\w-]+ ${s}\\b`).test(help)                    // a usage form
        || help.includes(`\\\`${s}\\\``);                                      // a named mention
      if (!described) drift.push(`${file}: help body never describes "${s}"`);
    }
  }
  assert.deepEqual(drift, []);
});

// `work --delivery`, `delivery close --date`, `change check --verbose`,
// `contract new --force`, `skill new --force` and `init --overwrite-content`
// were accepted by the parser and described nowhere a person looks: a flag
// that exists only in the code is one nobody uses on purpose.
test("every flag a command declares is described in its help", async () => {
  const missing = [];
  for (const file of readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
    const mod = await import(pathToFileURL(path.join(commandsDir, file)).href);
    if (!mod.flags) continue;
    const declared = [...(mod.flags.boolean ?? []), ...(mod.flags.string ?? [])].filter((f) => f !== "json");
    for (const f of declared) if (!String(mod.help ?? "").includes(`--${f}`)) missing.push(`${file}: --${f}`);
  }
  assert.deepEqual(missing, []);
});
