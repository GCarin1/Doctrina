// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex, indexesMatch } from "../lib/scan.js";
import { cliVersion } from "../lib/version.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { today } from "../lib/dates.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import * as templates from "./templates.js";
import * as validate from "./validate.js";

// Bring an existing project up to the installed CLI (user-reported gap: you
// `npm update doctrina-cli`, but the project you once `doctrina init`-ed
// keeps its old scaffold — stale framework stamp, an AGENTS.md that predates
// new commands, missing recommended sections). `upgrade` is the one command
// that closes that window, and it is an ORCHESTRATOR over the pieces that
// already exist — templates update (additive-only), index rebuild (stamp
// migration), validate --fix — so there is exactly one definition of each
// step. Preview by default; --write applies. Never rewrites user content
// (the same additive-only bound as `templates update`).

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "write"], string: [] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  const writeMode = flagBool(flags, "write", false);
  const running = cliVersion();

  // 1. Version gap: what the tree was last managed by vs what is installed.
  let index = null;
  let stamped = null;
  try {
    index = idx.load(projectRoot);
    stamped = index.framework_version ?? null;
  } catch {
    index = null;
  }
  console.log(c.bold("doctrina upgrade") + c.gray(` — project ${stamped ?? "unstamped"} → CLI ${running}${writeMode ? "" : " (preview; --write applies)"}`));
  console.log("");
  if (stamped === running) {
    console.log(c.gray("The framework stamp already matches the installed CLI — checking the scaffold anyway."));
    console.log("");
  }

  let pending = 0;

  // 2. Additive template updates (missing recommended sections in AGENTS.md /
  //    product.md, missing index.json fields). Reuses `templates update`
  //    verbatim: preview without --write, apply with it.
  console.log(c.gray("──── 1/3 scaffold shape (templates update)"));
  const tplFlags = writeMode ? new Map([["write", true]]) : new Map();
  const tplCode = await templates.run(["update"], tplFlags);
  if (tplCode !== 0 && !writeMode) pending += 1; // preview exits 1 when updates are pending

  // 3. Index: rebuild from the tree, which also migrates the framework stamp.
  console.log("");
  console.log(c.gray("──── 2/3 index + framework stamp"));
  try {
    const current = idx.load(projectRoot);
    const drifted = !indexesMatch(deriveIndex(projectRoot, current), current);
    const staleStamp = (current.framework_version ?? null) !== running;
    if (!drifted && !staleStamp) {
      console.log(c.green("ok") + " index.json matches the tree and the stamp is current");
    } else if (writeMode) {
      const derived = deriveIndex(projectRoot, current);
      derived.last_updated = today();
      idx.save(projectRoot, derived); // save() stamps framework_version
      console.log(c.green("rebuilt") + ` index.json${staleStamp ? ` — stamp ${current.framework_version ?? "unstamped"} → ${running}` : ""}`);
    } else {
      if (drifted) console.log(c.yellow("would  ") + "rebuild index.json from the tree (drifted)");
      if (staleStamp) console.log(c.yellow("would  ") + `migrate framework stamp ${current.framework_version ?? "unstamped"} → ${running}`);
      pending += 1;
    }
  } catch {
    if (writeMode) {
      console.log(c.red("error: ") + "index.json is missing or unreadable — run `doctrina index rebuild` manually");
    } else {
      console.log(c.yellow("would  ") + "rebuild index.json (missing or unreadable)");
      pending += 1;
    }
  }

  // 4. Full structural check — surfaces what the upgrade cannot fix by
  //    itself (new validate checks the old scaffold fails, hand-authored
  //    drift). The command surface in AGENTS.md is NOT in this bucket any
  //    more: step 1 regenerates the doctrina:surface block from the
  //    installed catalog (ADR 0015). --fix under --write so the mechanical
  //    part self-heals.
  console.log("");
  console.log(c.gray("──── 3/3 validate" + (writeMode ? " --fix" : "")));
  const vFlags = writeMode ? new Map([["fix", true]]) : new Map();
  const vCode = await validate.run([], vFlags);

  console.log("");
  if (!writeMode) {
    if (pending > 0) {
      console.log(c.yellow("pending") + ` upgrade steps found — apply them: ${c.cyan("doctrina upgrade --write")}`);
      return 1;
    }
    console.log(c.green("ok") + " nothing to upgrade — the project matches the installed CLI");
    return vCode;
  }
  if (vCode === 0) {
    console.log(c.green(`✓ project upgraded to ${running}`) + c.gray(" — review any warnings above; new commands: `doctrina --help`."));
    console.log(c.gray("AGENTS.md's doctrina:surface block was regenerated from the installed catalog, so agents reading the hub now discover the current commands."));
  } else {
    console.log(c.yellow("upgraded with findings") + " — resolve the validate errors above (they predate or exceed what an additive upgrade can fix).");
  }
  return vCode;
}

export const help = `
Usage: doctrina upgrade [--write]

Bring an existing project up to the installed CLI after an npm update.
The project keeps the scaffold of the version that init-ed it; this is
the one command that closes the gap, orchestrating the existing pieces:

  1. templates update   — regenerate the AGENTS.md doctrina:surface block
                          from the installed command catalog (the block is
                          CLI-owned, ADR 0015 — this is how agents reading
                          the hub discover commands added since init), and
                          append missing recommended sections / index.json
                          fields (additive-only outside the block)
  2. index rebuild      — regenerate index.json from the tree and migrate
                          the framework_version stamp to the running CLI
  3. validate (--fix)   — surface anything the upgrade cannot fix
                          (hand-authored drift, new validate checks)

Preview by default (exits 1 when steps are pending); --write applies.
`;
