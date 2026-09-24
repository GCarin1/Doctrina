// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPRECATED, OPERATIONS } from "../src/lib/commands.js";

// TAB COMPLETION OFFERS THE SURFACE, NOT ITS HISTORY.
//
// The completion scripts were generated from the whole catalog, so after
// 0.17 deprecated `analyze`, `report`, `skill sync` and `templates
// check|update`, pressing tab still offered them beside their
// replacements. A deprecated name keeps running for a script that types
// it; completion is how a person discovers what to type (change 0188).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const script = (shell) => spawnSync(process.execPath, [cliEntry, "completion", shell], {
  cwd: os.tmpdir(), encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
}).stdout;

const live = OPERATIONS.filter(([op]) => !DEPRECATED[op]).map(([op]) => op);
const liveCommands = new Set(live.map((op) => op.split(" ")[0]));
const words = (text) => new Set(text.match(/[a-z][a-z-]*/g) ?? []);

for (const shell of ["bash", "zsh", "pwsh"]) {
  test(`${shell} completion offers every live command and no deprecated name`, () => {
    const out = script(shell);
    const offered = words(out);
    for (const cmd of liveCommands) assert.ok(offered.has(cmd), `${cmd} missing`);
    for (const op of Object.keys(DEPRECATED)) {
      const [cmd, sub] = op.split(" ");
      if (!sub) assert.ok(!offered.has(cmd), `${shell} still offers ${op}`);
      else if (!live.some((l) => l.endsWith(` ${sub}`))) assert.ok(!offered.has(sub), `${shell} still offers ${op}`);
    }
  });
}
