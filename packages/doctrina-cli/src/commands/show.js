// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath } from "../lib/fs-ops.js";
import { parseAcceptanceCriteria } from "../lib/criteria.js";
import { suggest } from "../lib/suggest.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject, EXIT } from "../lib/exit-codes.js";
import { maskComments } from "../lib/doc-model.js";

// Point reads. An agent that needs ONE requirement re-reads a whole spec —
// hundreds of lines for a two-line fact. `show` resolves a compact reference
// to exactly the lines that own it:
//
//   doctrina show cli-R12    twelfth requirement of the cli spec (file order)
//   doctrina show gates-C3   acceptance criterion 3 (the spec's own numbering)
//   doctrina show 0007       ADR 0007, whole decision (already a bounded read)
//   doctrina show cli        the spec's header block + Purpose only
//
// R-refs are positional (file order across the EARS sections), so they shift
// when a requirement is inserted above — cite them for point reads and
// conversation, not as immutable identifiers. C-refs use the criteria's own
// explicit numbers and are as stable as the spec keeps them.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(positional, _flags) {
  const ref = positional[0];
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  if (!ref) {
    console.error(c.red("error:") + " show requires a reference");
    console.error(c.gray("hint: ") + "`doctrina show cli-R12` (requirement), `doctrina show cli-C3` (criterion), `doctrina show 0007` (ADR), `doctrina show cli` (spec header + purpose)");
    return 2;
  }

  // ADR by number.
  if (/^\d{4}$/.test(ref)) return showAdr(projectRoot, ref);

  const m = ref.match(/^([a-z][a-z0-9-]*)-([RC])(\d+)$/);
  if (m) return showSpecItem(projectRoot, m[1], m[2], Number(m[3]));

  if (/^[a-z][a-z0-9-]*$/.test(ref)) return showSpecHead(projectRoot, ref);

  console.error(c.red("error:") + ` unrecognised reference "${ref}"`);
  console.error(c.gray("hint: ") + "use <cap>-R<n>, <cap>-C<n>, an ADR number (0007), or a capability name");
  return 2;
}

function showAdr(projectRoot, num) {
  const dir = path.join(projectRoot, ".doctrina", "decisions");
  const file = isDir(dir) ? readdirSync(dir).find((f) => f.startsWith(`${num}-`) && f.endsWith(".md")) : null;
  if (!file) {
    console.error(c.red("error:") + ` no ADR ${num} under .doctrina/decisions/`);
    return EXIT.USAGE;
  }
  const full = path.join(dir, file);
  console.log(c.gray(`— ${relPath(projectRoot, full)} —`));
  console.log(read(full).trimEnd());
  return 0;
}

function loadSpec(projectRoot, cap) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const specPath = path.join(specsDir, cap, "spec.md");
  if (isFile(specPath)) return { specPath, text: read(specPath) };
  const known = isDir(specsDir) ? readdirSync(specsDir).filter((e) => isFile(path.join(specsDir, e, "spec.md"))) : [];
  console.error(c.red("error:") + ` no spec for capability "${cap}"`);
  const guess = suggest(cap, known);
  if (guess) console.error(c.gray("hint: ") + `did you mean "${guess}"?`);
  else if (known.length) console.error(c.gray("known: ") + known.sort().join(", "));
  return null;
}

function showSpecHead(projectRoot, cap) {
  const spec = loadSpec(projectRoot, cap);
  if (!spec) return EXIT.USAGE;
  const lines = spec.text.split(/\r?\n/);
  const out = [];
  let mode = "head"; // header block -> seek Purpose -> purpose body -> stop
  for (const line of lines) {
    const isH2 = /^##\s+/.test(line);
    if (mode === "head" && isH2) mode = /^##\s+Purpose\b/i.test(line) ? "purpose" : "seek";
    else if (mode === "seek" && isH2 && /^##\s+Purpose\b/i.test(line)) mode = "purpose";
    else if (mode === "purpose" && isH2) break;

    if (mode === "head" || (mode === "purpose")) out.push(line);
  }
  console.log(c.gray(`— ${relPath(projectRoot, spec.specPath)} (header + purpose; \`doctrina context ${cap}\` for the full spec) —`));
  console.log(out.join("\n").trimEnd());
  return 0;
}

function showSpecItem(projectRoot, cap, kind, n) {
  const spec = loadSpec(projectRoot, cap);
  if (!spec) return EXIT.USAGE;

  if (kind === "C") {
    const criteria = parseAcceptanceCriteria(spec.text);
    const crit = criteria.find((r) => r.n === n);
    if (!crit) {
      console.error(c.red("error:") + ` ${cap} has no acceptance criterion #${n} (it declares ${criteria.length})`);
      return EXIT.USAGE;
    }
    console.log(c.gray(`— ${cap}-C${n} · ${relPath(projectRoot, spec.specPath)} · ## Acceptance criteria —`));
    console.log(`${n}. ${crit.body}`);
    if (crit.proofPaths.length > 0) {
      console.log(c.gray(`   evidence: ${crit.proofPaths.join(", ")}`));
    }
    return 0;
  }

  const reqs = parseRequirements(spec.text);
  const req = reqs[n - 1];
  if (!req) {
    console.error(c.red("error:") + ` ${cap} has no requirement R${n} (it declares ${reqs.length})`);
    return EXIT.USAGE;
  }
  console.log(c.gray(`— ${cap}-R${n} · ${relPath(projectRoot, spec.specPath)} · ${req.section} —`));
  console.log(req.text);
  return 0;
}

// Top-level bullets of the "## Requirements (EARS)" section, in file order,
// each with its `### <grammar>` sub-section name and continuation lines.
export function parseRequirements(text) {
  // The scaffolded spec writes the five-line EARS legend as bullets inside
  // an HTML comment under `## Requirements (EARS)`. Counted as content, the
  // legend became R1..R5 and the capability's first real requirement was R6
  // — on every spec `doctrina spec new` had ever created. Comments are
  // blanked by position (same offsets, same line count), so the numbering
  // below is over authored bullets only.
  const lines = maskComments(text).split(/\r?\n/);
  const out = [];
  let inSection = false;
  let sub = "";
  let cur = null;
  const flush = () => {
    if (cur) out.push({ section: cur.section, text: cur.lines.join("\n").trimEnd() });
    cur = null;
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      flush();
      inSection = /^##\s+Requirements\b/i.test(line);
      sub = "";
      continue;
    }
    if (!inSection) continue;
    const subMatch = line.match(/^###\s+(.+)$/);
    if (subMatch) {
      flush();
      sub = subMatch[1].trim();
      continue;
    }
    if (/^-\s+/.test(line)) {
      flush();
      cur = { section: sub || "Requirements", lines: [line] };
    } else if (cur && (line.startsWith("  ") || line.trim() === "")) {
      cur.lines.push(line);
    } else {
      flush();
    }
  }
  flush();
  return out;
}

export const help = `
Usage: doctrina show <ref>

Point-read one artifact fragment instead of a whole file:

  doctrina show cli-R12    requirement 12 of the cli spec (file order)
  doctrina show cli-C3     acceptance criterion 3 (the spec's numbering)
  doctrina show 0007       ADR 0007 (the whole decision)
  doctrina show cli        the spec's header block + Purpose only

R-refs are positional across the WHOLE spec, in file order, and they shift
when a requirement is inserted above. C-refs use the criteria's own numbers.
Both count authored content only — a bullet inside an HTML comment (the
scaffold's EARS legend, for one) is annotation and is never numbered.

A spec delta's replace-requirement <section> <n> numbers differently, and
on purpose: it counts WITHIN one "### <section>", so the number stays put
when another section grows. doctrina show <cap>-RN prints the section it
landed in, which is what turns an R-ref into the delta's pair of coordinates.
Read-only.
`;
