// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { readTemplate, locateTemplatesDir, substitute } from "../lib/templates.js";
import { specHeader } from "../lib/scan.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { wantsJson, emitJson } from "../lib/json-out.js";
import {
  parseRuntimeDeclaration, checkStructure, checkWiring, checkEmptySemantics,
  checkEnums, checkSelectors,
} from "../lib/runtime.js";
import { artifactNameError } from "../lib/names.js";

// Contracts are the first-class home for the integration/runtime surface
// no single capability owns: the port map, the env/dependency contract,
// and the API/WS/event interface shapes. The criticism this answers: each
// capability was built against its own spec in isolation, and the seams
// between them fell in the gap with nobody accountable. `contract check`
// turns the parts that are mechanically verifiable (port collisions, env
// drift vs .env.example, referenced specs that must exist) into a gate.

const SUBCOMMANDS = ["new", "list", "check"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// `check` builds a real payload; `new` and `list` have nothing but their
// prose, so they keep the captured envelope (change 0068).
export const jsonNative = (args) => args[0] === "check";

export const flags = { boolean: ["json", "force"], string: [] };

export async function run(positional, flags) {
  const sub = positional[0];
  switch (sub) {
    case "new":
      return contractNew(positional.slice(1), flags);
    case "list":
      return contractList();
    case "check":
      return contractCheck(positional.slice(1), flags);
    default:
      console.error(c.red("error:") + ` unknown contract subcommand "${sub ?? ""}"`);
      const guess = suggest(sub, SUBCOMMANDS);
      console.error(c.gray("hint: ") + (guess
        ? `did you mean \`doctrina contract ${guess}\`?`
        : `available: ${SUBCOMMANDS.join(", ")}`));
      return 2;
  }
}

function contractNew(args, flags) {
  const name = args[0];
  const nameError = artifactNameError(name, "contract name");
  if (nameError) {
    console.error(c.red("error:") + ` ${nameError} (e.g. "system", "api")`);
    return 2;
  }
  const force = flagBool(flags, "force", false);
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const targetPath = path.join(projectRoot, ".doctrina", "contracts", `${name}.md`);
  if (exists(targetPath) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, targetPath)} already exists (pass --force to overwrite)`);
    return 1;
  }

  const tpl = readTemplate(projectRoot, "contract.md.template");
  const date = today();
  const body = substitute(tpl.body, { CONTRACT_NAME: name, DATE: date });
  write(targetPath, body, { force });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}` +
    (tpl.source === "project" ? c.gray(" (project template)") : ""));

  const index = idx.load(projectRoot);
  idx.addContract(index, {
    id: name,
    path: `.doctrina/contracts/${name}.md`,
    status: "active",
    last_updated: date,
  });
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` contract "${name}"`);
  console.log("");
  console.log("Fill in the Ports / Environment / Interfaces tables, then run " + c.cyan("doctrina contract check") + ".");
  console.log(c.gray("Declaring Wiring and Selectors rows is what makes the RUNTIME half checkable — without them, check can only verify the prose."));
  return 0;
}

function contractList() {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const dir = path.join(projectRoot, ".doctrina", "contracts");
  const rows = [];
  if (isDir(dir)) {
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith(".md")) continue;
      const text = read(path.join(dir, f));
      rows.push({ id: f.replace(/\.md$/, ""), status: specHeader(text, "Status") ?? "active", updated: specHeader(text, "Last updated") ?? "—" });
    }
  }
  if (rows.length === 0) {
    console.log(c.gray("no contracts found in .doctrina/contracts/ (create one with `doctrina contract new <name>`)"));
    return 0;
  }
  console.log(c.bold("Contracts:"));
  console.log("");
  for (const r of rows) console.log(`  ${c.cyan(r.id.padEnd(20))} ${r.status.padEnd(10)} ${r.updated}`);
  console.log("");
  console.log(c.gray(`${rows.length} contract${rows.length === 1 ? "" : "s"}`));
  return 0;
}

function contractCheck(args, cmdFlags) {
  const json = wantsJson(cmdFlags);
  // `--json` means the payload IS the answer: prose on stdout ahead of it
  // would corrupt the very output it describes.
  const say = (...parts) => { if (!json) console.log(...parts); };
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);
  const dir = path.join(projectRoot, ".doctrina", "contracts");

  let names;
  if (args[0]) {
    names = [args[0].replace(/\.md$/, "")];
  } else if (isDir(dir)) {
    names = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
  } else {
    names = [];
  }
  if (names.length === 0) {
    say(c.gray("no contracts to check in .doctrina/contracts/"));
    return 0;
  }

  let errors = 0;
  let warnings = 0;
  // The runtime half is counted, not just printed. A contract that declares
  // no Wiring and no Selectors was not checked — and the summary line is the
  // one thing the CI log and the close print, so it is the line that has to
  // say so (change 0029 decided the per-contract line; this is the same
  // decision applied to the total).
  let declaredRows = 0;
  let uncheckedContracts = 0;
  /** @type {Array<{contract: string, code: string, level: string, message: string, remedy: string}>} */
  const findings = [];
  /** @type {string[]} */
  const unchecked = [];
  for (const name of names) {
    const file = path.join(dir, `${name}.md`);
    if (!isFile(file)) {
      say(c.red("error: ") + `contract "${name}" not found at ${relPath(projectRoot, file)}`);
      errors += 1;
      continue;
    }
    const text = read(file);
    say(c.bold(name) + c.gray(` (${relPath(projectRoot, file)})`));

    // 1-3. The STRUCTURAL half — port collisions, environment drift against
    //      .env.example, references to specs that do not exist. One
    //      collection in lib/runtime.js (change 0103), shared with the
    //      close's runtime step and `doctor`, so a contract this command
    //      fails cannot pass the close.
    for (const f of checkStructure(projectRoot, text)) {
      const mark = f.level === "error" ? c.red("  ✗ ") : c.yellow("  ! ");
      say(mark + f.message + c.gray(` [${f.code}]`));
      findings.push({ contract: name, code: f.code, level: f.level, message: f.message, remedy: f.remedy });
      if (f.level === "error") errors += 1;
      else warnings += 1;
    }

    // 4. The RUNTIME half: a declaration is only worth what binds it to the
    //    running system. These checks read the contract's Wiring, Selectors
    //    and Values declarations and hold the implementation to them — the
    //    "I set the secret in GitHub and nothing happened" class, the
    //    default that an empty value never triggers, the enum nothing
    //    validates, and the selector that matches zero cases and exits 0.
    //    Every section is optional, so a contract written before they
    //    existed checks exactly as it did before.
    const decl = parseRuntimeDeclaration(text);
    for (const f of [
      ...checkWiring(projectRoot, decl),
      ...checkEmptySemantics(projectRoot, decl),
      ...checkEnums(projectRoot, decl),
      ...checkSelectors(projectRoot, decl),
    ]) {
      const mark = f.level === "error" ? c.red("  ✗ ") : c.yellow("  ! ");
      say(mark + f.message + c.gray(` [${f.code}]`));
      say(`      ${c.gray(`fix: ${f.remedy}`)}`);
      findings.push({ contract: name, code: f.code, level: f.level, message: f.message, remedy: f.remedy });
      if (f.level === "error") errors += 1;
      else warnings += 1;
    }

    const rows = decl.wiring.length + decl.selectors.length;
    declaredRows += rows;
    if (rows === 0) {
      // Silence here is not proof of correctness — it is proof that nothing
      // was declared. Saying so is what stops a green check from being read
      // as "the wiring is verified".
      uncheckedContracts += 1;
      unchecked.push(name);
      say(c.gray("  · no Wiring or Selectors declared — the runtime surface is unchecked"));
    }
  }

  say("");
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // The MACHINE answer, in a field of its own (change 0068). Change 0056 took
  // the word "consistent" out of the human summary for an undeclared surface;
  // the envelope kept saying `ok: true`, because the only machine signal was
  // the exit code — and the exit code is 0 by the deliberate decision of
  // change 0029 (an undeclared surface is REPORTED, not failed). Right for the
  // status, wrong as the only signal: a consumer reading only the envelope was
  // exactly where the human reader stood before 0056. So it branches on
  // `unchecked`, the same way change 0061 gave deprecation a field of its own.
  const emit = (verdict, code) => {
    if (json) {
      emitJson("contract check", {
        contracts: names,
        checked: names.length - unchecked.length,
        unchecked,
        declared_rows: declaredRows,
        findings,
        verdict,
      }, { ok: errors === 0, exitCode: code });
    }
    return code;
  };

  if (errors > 0) {
    say(c.red("fail") + ` ${plural(errors, "error")}, ${plural(warnings, "warning")}`);
    return emit("failed", 1);
  }

  // "consistent" is a claim about something that was verified. Where nothing
  // was declared there is nothing to be consistent WITH, so the word does not
  // appear — the same state `doctor` calls "unchecked" and `triage` calls
  // "UNCHECKED, not verified" is not allowed to read as approval here just
  // because this is the copy that runs in CI. It stays exit 0: change 0029
  // decided an undeclared surface is reported, not failed.
  if (uncheckedContracts > 0) {
    const scope = uncheckedContracts === names.length
      ? `${plural(names.length, "contract")}`
      : `${uncheckedContracts} of ${plural(names.length, "contract")}`;
    const verb = uncheckedContracts === 1 && names.length === 1 ? "declares" : "declare";
    say(c.yellow("warn") + ` ${scope} ${verb} no Wiring/Selectors rows — the runtime surface is unchecked` +
      (warnings > 0 ? c.gray(`; ${plural(warnings, "warning")} above`) : ""));
    return emit("unchecked", 0);
  }

  const held = `${plural(names.length, "contract")} consistent, ${plural(declaredRows, "declared row")} ${declaredRows === 1 ? "holds" : "hold"}`;
  say(c.green("ok") + ` ${held}` + (warnings > 0 ? c.gray(`; ${plural(warnings, "warning")} above`) : ""));
  return emit("consistent", 0);
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
}

export const help = `
Usage: doctrina contract <subcommand> [args]

Own the integration/runtime surface no single capability spec owns:
the port map, the environment contract, and API/WS/event interfaces.

Subcommands:
  new <name>          Scaffold .doctrina/contracts/<name>.md and index it
  list                One line per contract: id, status, last updated
  check [<name>]      Verify the mechanically checkable parts.

                      Structure: no two services share a port, every
                      declared env var exists in .env.example, and every
                      referenced spec exists.

                      Runtime — the declaration held to the implementation:
                        RT01/02  a variable declared with origin vars or
                                 secrets must be exported by an env: block
                                 in the workflow the Wiring row names, from
                                 the origin and name it declares.
                        RT03     its consumer must not give it a default
                                 that only applies when ABSENT: CI injects
                                 the empty string, so the default never
                                 fires (textual lint).
                        RT04     a declared Values enum must hold in
                                 .env.example, and the consumer should
                                 validate it.
                        RT05     every declared selector must match at
                                 least one target, or a run dispatched on
                                 it executes nothing and still exits 0.

                      No CI system or test runner is parsed natively: each
                      check reads the glob, pattern and origin the contract
                      declares. Exits 1 on errors, 0 on warnings only.
`;
