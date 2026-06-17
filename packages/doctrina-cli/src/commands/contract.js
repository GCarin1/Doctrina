import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import { specHeader } from "../lib/scan.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

// Contracts are the first-class home for the integration/runtime surface
// no single capability owns: the port map, the env/dependency contract,
// and the API/WS/event interface shapes. The criticism this answers: each
// capability was built against its own spec in isolation, and the seams
// between them fell in the gap with nobody accountable. `contract check`
// turns the parts that are mechanically verifiable (port collisions, env
// drift vs .env.example, referenced specs that must exist) into a gate.

const SUBCOMMANDS = ["new", "list", "check"];

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
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(c.red("error:") + " contract name must be lowercase letters, digits, or hyphens (e.g. \"system\", \"api\").");
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

  const templatesDir = locateTemplatesDir();
  const date = today();
  const body = substitute(read(path.join(templatesDir, "contract.md.template")), { CONTRACT_NAME: name, DATE: date });
  write(targetPath, body, { force });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}`);

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

function contractCheck(args, _flags) {
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
    console.log(c.gray("no contracts to check in .doctrina/contracts/"));
    return 0;
  }

  // The env contract is checked against .env.example when one exists.
  const envExamplePath = path.join(projectRoot, ".env.example");
  const envExample = isFile(envExamplePath) ? read(envExamplePath) : null;

  let errors = 0;
  let warnings = 0;
  for (const name of names) {
    const file = path.join(dir, `${name}.md`);
    if (!isFile(file)) {
      console.log(c.red("error: ") + `contract "${name}" not found at ${relPath(projectRoot, file)}`);
      errors += 1;
      continue;
    }
    const text = read(file);
    console.log(c.bold(name) + c.gray(` (${relPath(projectRoot, file)})`));

    // 1. Port collisions — two services must not claim the same port.
    const ports = parseTable(sectionOf(text, "Ports"));
    if (ports) {
      const portCol = colIndex(ports.headers, "port");
      const svcCol = colIndex(ports.headers, "service");
      const seen = new Map();
      for (const row of ports.rows) {
        const port = (row[portCol] ?? "").trim();
        if (!/^\d+$/.test(port)) continue;
        const svc = (row[svcCol] ?? "?").trim();
        if (seen.has(port)) {
          console.log(c.red("  ✗ ") + `port ${port} is claimed by both "${seen.get(port)}" and "${svc}"`);
          errors += 1;
        } else {
          seen.set(port, svc);
        }
      }
    }

    // 2. Environment drift — every declared variable must exist in
    //    .env.example (when present), so code, example, and infra agree.
    const env = parseTable(sectionOf(text, "Environment"));
    if (env && envExample !== null) {
      const varCol = colIndex(env.headers, "variable");
      for (const row of env.rows) {
        const name2 = (row[varCol] ?? "").trim();
        if (!/^[A-Z][A-Z0-9_]*$/.test(name2)) continue;
        const declared = new RegExp(`^\\s*(export\\s+)?${name2}\\s*=`, "m").test(envExample);
        if (!declared) {
          console.log(c.yellow("  ! ") + `env var ${name2} is in the contract but absent from .env.example`);
          warnings += 1;
        }
      }
    }

    // 3. Referenced capability specs must exist.
    for (const refCap of referencedCapabilities(sectionOf(text, "References"))) {
      const specPath = path.join(projectRoot, ".doctrina", "specs", refCap, "spec.md");
      if (!isFile(specPath)) {
        console.log(c.red("  ✗ ") + `references spec "${refCap}" but ${relPath(projectRoot, specPath)} does not exist`);
        errors += 1;
      }
    }
  }

  console.log("");
  if (errors === 0 && warnings === 0) {
    console.log(c.green("ok") + ` ${names.length} contract${names.length === 1 ? "" : "s"} consistent`);
    return 0;
  }
  const summary = `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`;
  console.log((errors === 0 ? c.green("ok") : c.red("fail")) + " " + summary);
  return errors === 0 ? 0 : 1;
}

// Return the body of a "## <name>" section, up to the next "## " heading.
function sectionOf(text, name) {
  const lines = text.split(/\r?\n/);
  const head = new RegExp(`^##\\s+${name}\\b`, "i");
  let inSection = false;
  const out = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inSection = head.test(line);
      continue;
    }
    if (inSection) out.push(line);
  }
  return out.join("\n");
}

// Parse a GitHub-flavoured Markdown table into { headers, rows }.
function parseTable(text) {
  const lines = text.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  if (lines.length < 2) return null;
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cl) => cl.trim());
  const headers = cells(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = cells(lines[i]);
    if (row.every((cl) => /^:?-+:?$/.test(cl) || cl === "")) continue; // separator row
    rows.push(row);
  }
  return { headers, rows };
}

function colIndex(headers, name) {
  const i = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  return i < 0 ? 0 : i;
}

// Capability names referenced as `specs/<cap>` (placeholder <...> ignored).
function referencedCapabilities(text) {
  const out = new Set();
  for (const m of text.matchAll(/specs\/([a-z][a-z0-9-]*)/g)) out.add(m[1]);
  return [...out];
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
}

export const help = `
Usage: doctrina contract <subcommand> [args]

Own the integration/runtime surface no single capability spec owns:
the port map, the environment contract, and API/WS/event interfaces.

Subcommands:
  new <name>          Scaffold .doctrina/contracts/<name>.md and index it
  list                One line per contract: id, status, last updated
  check [<name>]      Verify the mechanically checkable parts: no two
                      services share a port, every declared env var exists
                      in .env.example, and every referenced spec exists.
                      Exits 1 on errors (port collisions, missing specs).
`;
