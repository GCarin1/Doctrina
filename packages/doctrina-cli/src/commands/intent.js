import path from "node:path";
import process from "node:process";
import { exists, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

// Post-intake intent evolution (0.11.0 field review item 8). The intake is
// converted once; capabilities born later — brainstorms, pivots, new asks —
// had no way to gain a product anchor, so they inevitably ended at
// `Realizes: n/a` and `trace` reported "14/14 ok" while blind to 40% of the
// system. `intent add` appends a new [SC*] anchor bullet to product.md's
// Success criteria (allocating the next number), so growth keeps provenance:
// new intent gets an anchor, the new spec Realizes it, `trace` sees it.
//
// The CLI allocates and appends; WHAT the intent says is the human/agent's
// words verbatim (ADR 0005).

const SUBCOMMANDS = ["add", "list"];

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(positional, _flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown intent subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina intent ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  if (sub === "list") return intentList(projectRoot);
  return intentAdd(projectRoot, positional.slice(1).join(" ").trim());
}

function productPathOf(projectRoot) {
  return path.join(projectRoot, ".doctrina", "product.md");
}

// Every "[A-Z]+\d+" anchor at the head of a bullet, in document order —
// the same convention `trace` reads.
function collectAnchors(text) {
  const out = [];
  const seen = new Set();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*[-*]\s+\[([A-Z]+)(\d+)\]\s+(.*)$/);
    if (m && !seen.has(m[1] + m[2])) {
      seen.add(m[1] + m[2]);
      out.push({ prefix: m[1], num: Number(m[2]), id: m[1] + m[2], text: m[3].trim(), line: i });
    }
  }
  return out;
}

function intentList(projectRoot) {
  const p = productPathOf(projectRoot);
  if (!isFile(p)) {
    console.error(c.red("error:") + " no .doctrina/product.md");
    return 1;
  }
  const anchors = collectAnchors(read(p));
  if (anchors.length === 0) {
    console.log(c.gray("no intent anchors in product.md — tag bullets with `- [SC1] ...`, or add one: doctrina intent add \"<text>\""));
    return 0;
  }
  console.log(c.bold("Intent anchors") + c.gray(" — product.md, document order:"));
  console.log("");
  for (const a of anchors) {
    console.log(`  ${c.cyan(a.id.padEnd(6))} ${a.text}`);
  }
  console.log("");
  console.log(c.gray(`${anchors.length} anchor${anchors.length === 1 ? "" : "s"}. Provenance: doctrina trace · doctrina why <id>`));
  return 0;
}

function intentAdd(projectRoot, textArg) {
  if (!textArg) {
    console.error(c.red("error:") + " intent add requires the intent text (quote it)");
    console.error(c.gray("hint: ") + `example: doctrina intent add "Risk map answers 'what should we test next?' in one read"`);
    return 2;
  }
  const p = productPathOf(projectRoot);
  if (!isFile(p)) {
    console.error(c.red("error:") + " no .doctrina/product.md — run `doctrina init` / `doctrina intake` first");
    return 1;
  }
  const original = read(p);
  const anchors = collectAnchors(original);

  // Accept "SC15: text" to pin an explicit id; otherwise allocate the next
  // number for the dominant prefix (SC by default).
  let id = null;
  let text = textArg;
  const pinned = textArg.match(/^([A-Z]+)(\d+)\s*:\s*(.+)$/);
  if (pinned) {
    id = pinned[1] + pinned[2];
    text = pinned[3].trim();
    if (anchors.some((a) => a.id === id)) {
      console.error(c.red("error:") + ` anchor [${id}] already exists in product.md`);
      return 1;
    }
  } else {
    const prefix = anchors.length > 0 ? dominantPrefix(anchors) : "SC";
    const maxNum = anchors.filter((a) => a.prefix === prefix).reduce((m, a) => Math.max(m, a.num), 0);
    id = `${prefix}${maxNum + 1}`;
  }

  const lines = original.split(/\r?\n/);
  const bullet = `- [${id}] ${text}`;

  // Insertion point: after the LAST existing anchor bullet (keeps them
  // contiguous); else at the end of "## Success criteria"; else appended as a
  // new Success criteria section (a product.md without one gains it).
  const samePrefix = anchors.length > 0;
  let inserted = false;
  if (samePrefix) {
    const last = anchors[anchors.length - 1];
    lines.splice(last.line + 1, 0, bullet);
    inserted = true;
  } else {
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s+Success criteria\b/i.test(lines[i])) {
        // Insert before the next "## " heading (or at EOF).
        let j = i + 1;
        while (j < lines.length && !/^##\s+/.test(lines[j])) j += 1;
        // Trim trailing blank lines inside the section for a tidy append.
        let k = j;
        while (k > i + 1 && lines[k - 1].trim() === "") k -= 1;
        lines.splice(k, 0, bullet);
        inserted = true;
        break;
      }
    }
  }
  if (!inserted) {
    lines.push("", "## Success criteria", "", bullet);
  }

  write(p, lines.join("\n"), { force: true });
  console.log(c.green("added") + ` [${id}] to ${relPath(projectRoot, p)}`);
  console.log("");
  console.log(`  ${c.cyan(id.padEnd(6))} ${text}`);
  console.log("");
  console.log(c.gray("Next: the spec that delivers this intent declares it —"));
  console.log(`    ${c.cyan(`**Realizes:** ${id}`)}  ${c.gray("(in .doctrina/specs/<capability>/spec.md; `doctrina trace` closes the loop)")}`);
  return 0;
}

function dominantPrefix(anchors) {
  const counts = new Map();
  for (const a of anchors) counts.set(a.prefix, (counts.get(a.prefix) ?? 0) + 1);
  return [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
}

export const help = `
Usage: doctrina intent add "<text>"
       doctrina intent add "SC15: <text>"
       doctrina intent list

Post-intake intent evolution. \`add\` appends a new intent anchor bullet
(\`- [SC5] <text>\`) to product.md's Success criteria, allocating the next
number automatically (or pin one with the "SC15: ..." form). New
capabilities born after the intake — brainstorms, pivots — get an anchor
to Realize instead of inevitably landing at "Realizes: n/a", so
\`doctrina trace\` keeps seeing the whole system as it grows.

\`list\` prints every anchor in document order (the same convention trace
reads). The CLI allocates and appends; the intent's wording is yours,
verbatim (ADR 0005).
`;
