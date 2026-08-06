import path from "node:path";
import process from "node:process";
import { exists, isFile, mkdirp, read, relPath, remove, write } from "../lib/fs-ops.js";
import {
  ADAPTER_STATES, adapterFiles, describeAdapter, listAdapterNames, renderAdapterFile,
} from "../lib/adapters.js";
import { flagBool } from "../lib/args.js";
import { today } from "../lib/dates.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

// `doctrina adapter` — add, remove, and inventory agent adapters (audit
// item C1).
//
// Before this command the only way to add an adapter to an existing project
// was `doctrina init --agent <name> --force`, because `init` refuses to run
// twice. That path regenerated AGENTS.md and .doctrina/product.md from
// blank templates, silently destroying every hand-authored rule and the
// product definition. `adapter add` is strictly additive: it writes that
// adapter's own files and never reads or writes AGENTS.md, product.md, or
// any other project artifact.

const SUBCOMMANDS = ["list", "add", "remove"];

export const flags = { boolean: ["json", "force"], string: [] };

export async function run(positional, cmdFlags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown adapter subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina adapter ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  if (sub === "list") return adapterList(projectRoot);
  if (sub === "add") return adapterAdd(projectRoot, positional[1], cmdFlags);
  return adapterRemove(projectRoot, positional[1], cmdFlags);
}

function adapterList(projectRoot) {
  const names = listAdapterNames(projectRoot);
  if (names.length === 0) {
    console.log(c.gray("no adapters available (no templates/adapters directory found)"));
    return 0;
  }
  const rows = names.map((n) => describeAdapter(projectRoot, n));
  const label = {
    [ADAPTER_STATES.INSTALLED]: c.green("installed"),
    [ADAPTER_STATES.AVAILABLE]: c.gray("available"),
    [ADAPTER_STATES.NATIVE]: c.cyan("native   "),
  };

  console.log(c.bold("Agent adapters:"));
  console.log("");
  for (const r of rows) {
    const suffix = r.state === ADAPTER_STATES.NATIVE
      ? c.gray("reads AGENTS.md directly — no file needed")
      : c.gray(`${r.installed.length}/${r.files.length} file${r.files.length === 1 ? "" : "s"}` +
        (r.source === "project" ? " · project template" : ""));
    console.log(`  ${label[r.state]}  ${c.cyan(r.name.padEnd(10))}  ${suffix}`);
  }
  console.log("");
  const installed = rows.filter((r) => r.state === ADAPTER_STATES.INSTALLED).length;
  const native = rows.filter((r) => r.state === ADAPTER_STATES.NATIVE).length;
  console.log(c.gray(
    `${installed} installed · ${rows.length - installed - native} available · ${native} native. ` +
    "Add one: ") + c.cyan("doctrina adapter add <name>"));
  return 0;
}

function adapterAdd(projectRoot, name, cmdFlags) {
  if (!name) {
    console.error(c.red("error:") + " adapter add requires a name (see `doctrina adapter list`)");
    return 2;
  }
  const spec = adapterFiles(projectRoot, name);
  if (!spec) {
    console.error(c.red("error:") + ` unknown adapter "${name}"`);
    const guess = suggest(name, listAdapterNames(projectRoot));
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina adapter add ${guess}\`?`
      : "run `doctrina adapter list` for the available adapters"));
    return 2;
  }
  if (spec.files.length === 0) {
    console.log(c.cyan("native  ") + ` ${name} reads AGENTS.md directly — nothing to install`);
    console.log(c.gray("Its rules already reach the agent through the hub at AGENTS.md."));
    return 0;
  }

  const force = flagBool(cmdFlags, "force", false);
  const tokens = {
    PROJECT_NAME: path.basename(projectRoot),
    PROJECT_DESCRIPTION: "",
    DATE: today(),
  };

  // Additive by construction: only this adapter's own files are touched,
  // and an existing one is left alone unless --force is given. AGENTS.md
  // and product.md are never read or written here.
  let written = 0;
  let skipped = 0;
  for (const file of spec.files) {
    const dest = path.join(projectRoot, file.relativePath);
    if (exists(dest) && !force) {
      console.log(c.yellow("skip   ") + ` ${file.relativePath} (already present; --force overwrites)`);
      skipped += 1;
      continue;
    }
    mkdirp(path.dirname(dest));
    write(dest, renderAdapterFile(file, tokens), { force: true });
    console.log(c.green("created") + ` ${relPath(projectRoot, dest)}`);
    written += 1;
  }

  console.log("");
  console.log(`${c.bold("Adapter " + name)} — ${written} file${written === 1 ? "" : "s"} written` +
    (skipped > 0 ? `, ${skipped} left alone` : "") +
    (spec.source === "project" ? c.gray(" (from .doctrina/templates/adapters/)") : ""));
  console.log(c.gray("Additive only: AGENTS.md and .doctrina/product.md were not touched."));
  return 0;
}

function adapterRemove(projectRoot, name, cmdFlags) {
  if (!name) {
    console.error(c.red("error:") + " adapter remove requires a name (see `doctrina adapter list`)");
    return 2;
  }
  const spec = adapterFiles(projectRoot, name);
  if (!spec) {
    console.error(c.red("error:") + ` unknown adapter "${name}"`);
    return 2;
  }
  if (spec.files.length === 0) {
    console.log(c.cyan("native  ") + ` ${name} installs no files — nothing to remove`);
    return 0;
  }

  // Only delete files this adapter created AND that still match what it
  // would write. A file the user edited is theirs now; --force overrides.
  const force = flagBool(cmdFlags, "force", false);
  const tokens = { PROJECT_NAME: path.basename(projectRoot), PROJECT_DESCRIPTION: "", DATE: today() };
  let removed = 0;
  let kept = 0;
  for (const file of spec.files) {
    const dest = path.join(projectRoot, file.relativePath);
    if (!isFile(dest)) continue;
    const pristine = normalise(read(dest)) === normalise(renderAdapterFile(file, tokens));
    if (!pristine && !force) {
      console.log(c.yellow("kept   ") + ` ${file.relativePath} (edited since install; --force removes it)`);
      kept += 1;
      continue;
    }
    remove(dest);
    console.log(c.green("removed") + ` ${file.relativePath}`);
    removed += 1;
  }
  console.log("");
  console.log(`${c.bold("Adapter " + name)} — ${removed} file${removed === 1 ? "" : "s"} removed` +
    (kept > 0 ? `, ${kept} kept (edited)` : ""));
  return 0;
}

function normalise(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
}

export const help = `
Usage: doctrina adapter <list|add|remove> [name] [--force]

Add, remove, and inventory the per-agent adapter files that point at
AGENTS.md. Adding an adapter is strictly additive: only that adapter's own
files are written, and AGENTS.md / .doctrina/product.md are never touched.

Subcommands:
  list             Every adapter with its state:
                     installed — its files are present
                     available — it ships files and none are installed
                     native    — the agent reads AGENTS.md directly and
                                 needs no file at all
  add <name>       Install one adapter's files. An existing file is left
                   alone unless --force is given.
  remove <name>    Delete the files this adapter created. A file edited
                   since install is kept unless --force is given.

Custom adapters: a directory at .doctrina/templates/adapters/<name>/ is
installable by name and takes precedence over a bundled adapter of the
same name.

Options:
  --force          With add, overwrite an existing file; with remove,
                   delete a file that was edited after install.
`;
