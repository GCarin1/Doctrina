#!/usr/bin/env node
// Executable check for docs/ — the proof behind the `docs` spec's
// acceptance criteria (.doctrina/specs/docs/spec.md). Zero deps.
//
// Two families of check. SHAPE (1-5) asks "is this file laid out right?".
// ACCURACY (6-13) asks "is what it says true?" — the family that was
// missing, which let a page document a removed command, a renamed flag, or
// a stale exit code while `doctrina verify` stayed green (audit item D1).
//
// Shape:
//   1. docs/en and docs/pt hold identical *.md filename sets (parity).
//   2. Every prose file carries exactly one H1 (infrastructure files —
//      _sidebar.md — are exempt; index.html/.nojekyll/assets are not .md).
//   3. No prose file exceeds the 250-line soft cap. Lookup references
//      (cli-reference.md) are exempt: they are consulted per-section,
//      never read linearly, so the lost-in-the-middle cap does not apply.
//   4. Every PT prose file states near the top that EN is the source.
//   5. README.md links to docs/en/ and README.pt.md links to docs/pt/.
//
// Accuracy:
//   6. Every `doctrina <command>` named in docs, the READMEs, AGENTS.md or
//      action.yml resolves to a command in the CLI catalog.
//   7. Every `--flag` documented in a cli-reference flag table is declared
//      in that command's exported flag spec (shared with the C3 source
//      test via lib/flag-catalog.js — one invariant, two consumers).
//      Commands that do not yet export a spec are counted and skipped.
//   8. Every fenced block that shows CLI *output* is marked
//      `<!-- illustrative -->`. Untagged stale output is the most damaging
//      doc error because it looks authoritative.
//   9. Every relative link resolves to a file that exists. Docsify router
//      paths (`/en/...`) are routes, not filesystem paths, and are exempt.
//  10. EN and PT files for the same page stay within a length ratio.
//      Filename parity is not content parity.
//  11. The cli-reference documents no command that no longer exists — the
//      reverse of check 6, and the direction that lets a page outlive the
//      command it describes.
//  12. A README that states a command COUNT states it correctly. Both
//      READMEs had drifted (35 claimed, 36 real) with every gate green.
//  13. Every "**Status:** vX.Y.Z" stamp equals the package version. The
//      canonical version has one home; every other mention is a copy, and
//      the copies have drifted to three different values twice.
//
// Wired into `doctrina verify` via .doctrina/verify.json. Exits 1 on any
// violation, 0 when clean.
//
// Usage: node scripts/check-docs.js

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES, OPERATIONS } from "../packages/doctrina-cli/src/lib/commands.js";
import { declaredFlags } from "../packages/doctrina-cli/src/lib/flag-catalog.js";

const OPERATION_NAMES = OPERATIONS.map((o) => o[0]);
const INFRASTRUCTURE = new Set(["_sidebar.md"]);
const CAP_EXEMPT = new Set(["cli-reference.md"]); // lookup reference, read per-section
const LINE_CAP = 250;
// EN is the source; a translation runs a little longer in Portuguese. Outside
// this band the two pages are no longer saying the same thing.
const RATIO_MIN = 0.75;
const RATIO_MAX = 1.30;

const mdFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith(".md")).sort();

// Every Markdown file under `dir`, one level deep on either side, as paths
// relative to the repository root. Used by the surface-count check, which
// has to reach docs/en/README.md and docs/pt/README.md as well as the roots.
const markdownUnder = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownUnder(full));
    else if (entry.name.endsWith(".md")) out.push(path.relative(dir, full) === entry.name ? full : full);
  }
  return out;
};

// Run every check against a repository root. Exported so the test suite can
// point it at a fixture tree and prove each check actually fires — a gate
// nobody has seen fail is a gate nobody knows works.
export async function runChecks(root) {
const problems = [];
const unspeccedRef = { count: 0 };
const enDir = path.join(root, "docs", "en");
const ptDir = path.join(root, "docs", "pt");

// ---------------------------------------------------------------- shape 1-5

const en = mdFiles(enDir);
const pt = mdFiles(ptDir);
for (const f of en) if (!pt.includes(f)) problems.push(`parity: docs/en/${f} has no docs/pt/${f}`);
for (const f of pt) if (!en.includes(f)) problems.push(`parity: docs/pt/${f} has no docs/en/${f}`);

/** @type {Array<[string, string[], boolean]>} */
const localePasses = [[enDir, en, false], [ptDir, pt, true]];
for (const [dir, files, isPt] of localePasses) {
  for (const f of files) {
    if (INFRASTRUCTURE.has(f)) continue;
    const rel = `docs/${isPt ? "pt" : "en"}/${f}`;
    const text = readFileSync(path.join(dir, f), "utf8");
    const lines = text.split(/\r?\n/);

    // 2. Exactly one H1 — counted outside fenced code blocks, where a
    //    `# comment` in a shell example is not a heading.
    const prose = text.replace(/```[\s\S]*?```/g, "");
    const h1s = prose.split(/\r?\n/).filter((l) => /^#\s/.test(l)).length;
    if (h1s !== 1) problems.push(`h1: ${rel} has ${h1s} H1 headings (expected exactly 1)`);

    // 3. Line cap for prose docs.
    if (!CAP_EXEMPT.has(f) && lines.length > LINE_CAP) {
      problems.push(`cap: ${rel} is ${lines.length} lines (> ${LINE_CAP} soft cap for prose docs)`);
    }

    // 4. PT files declare EN as the source, near the top.
    if (isPt) {
      const top = lines.slice(0, 12).join("\n");
      if (!/ingl[eê]s|english/i.test(top)) {
        problems.push(`source-note: ${rel} does not state near the top that EN is the source`);
      }
    }
  }
}

// 5. The two READMEs link to their language's docs tree.
for (const [readme, needle] of [["README.md", "docs/en"], ["README.pt.md", "docs/pt"]]) {
  const p = path.join(root, readme);
  if (!existsSync(p) || !readFileSync(p, "utf8").includes(needle)) {
    problems.push(`readme: ${readme} does not link to ${needle}/`);
  }
}

// ------------------------------------------------------------- accuracy 6-10

// Every file whose CLI claims must be true — the docs plus the surfaces that
// carry command references outside docs/.
const factual = [
  ...en.map((f) => `docs/en/${f}`),
  ...pt.map((f) => `docs/pt/${f}`),
  "README.md", "README.pt.md", "AGENTS.md", "action.yml",
];

const known = new Set(COMMAND_NAMES);

// A block of CLI output rather than a bare invocation: any line that opens
// with a status marker the CLI prints. Invocation-only blocks (the common
// case) are not output and need no marker.
const OUTPUT_SIGNATURE =
  /^\s*(✓|✗|⚠|·|ok\s|fail\s|gap\s|error:|warn:|note:|hint:|created\s|applied|archived|indexed|ticked|fixed\s|rebuilt\s|removed\s|synced|would\s+|skip\s|update\s)/m;

for (const rel of factual) {
  const p = path.join(root, rel);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");

  // 6. Command references, read from CODE context only (a fenced block or an
  //    inline backtick span) so prose like "the doctrina framework" is not
  //    mistaken for a command reference.
  const chunks = [];
  const outsideFences = text.replace(/```[\s\S]*?```/g, (block) => {
    chunks.push(block);
    return "\n";
  });
  for (const m of outsideFences.matchAll(/`[^`]+`/g)) chunks.push(m[0]);
  const codeText = chunks.join("\n");
  const unknown = new Set();
  for (const m of codeText.matchAll(/(?:npx\s+doctrina-cli|doctrina)\s+([a-z][a-z-]+)/g)) {
    if (!known.has(m[1])) unknown.add(m[1]);
  }
  for (const cmd of [...unknown].sort()) {
    problems.push(`command: ${rel} documents \`doctrina ${cmd}\`, which is not a CLI command`);
  }

  // 8. Output blocks carry an explicit marker. The marker may sit on the
  //    line before the fence or anywhere in the paragraph introducing it.
  const fenceRe = /```[\s\S]*?```/g;
  let fm;
  while ((fm = fenceRe.exec(text))) {
    if (!OUTPUT_SIGNATURE.test(fm[0])) continue;
    const before = text.slice(Math.max(0, fm.index - 400), fm.index);
    if (!/<!--\s*illustrative\s*-->/.test(before)) {
      const line = text.slice(0, fm.index).split(/\r?\n/).length;
      problems.push(
        `output-block: ${rel}:${line} shows CLI output with no \`<!-- illustrative -->\` marker ` +
          `(untagged output goes stale while looking authoritative)`,
      );
    }
  }

  // 9. Relative links resolve. Docsify serves docs/ as a SPA, so a link
  //    beginning with "/" is a router route (e.g. /en/flow.md), not a path.
  //    Links inside fenced blocks are sample content (a skill body showing
  //    what a link looks like), not navigation — `outsideFences` drops them.
  for (const m of outsideFences.matchAll(/\[[^\]]*\]\(([^)]*)\)/g)) {
    const href = m[1].trim();
    if (!href || /^(https?:|mailto:|#|\/)/.test(href)) continue;
    const clean = href.split("#")[0];
    if (!clean) continue;
    if (!existsSync(path.resolve(path.dirname(p), clean))) {
      problems.push(`link: ${rel} links to ${href}, which does not exist`);
    }
  }
}

// 7. Documented flags are declared flags. Scoped to the cli-reference flag
//    TABLES, where attribution to a command is structural: a section heading
//    names the command, and each table row names one flag. Prose mentions
//    elsewhere ("pass through to `change archive --force`") are deliberately
//    out of scope — they are not attributable without guessing.
for (const lang of ["en", "pt"]) {
  const refPath = path.join(root, "docs", lang, "cli-reference.md");
  if (!existsSync(refPath)) continue;
  let command = null;
  for (const line of readFileSync(refPath, "utf8").split(/\r?\n/)) {
    const heading = line.match(/^##\s+`(?:npx\s+doctrina-cli|doctrina)\s+([a-z][a-z-]*)/);
    if (heading) {
      command = known.has(heading[1]) ? heading[1] : null;
      continue;
    }
    if (/^##\s/.test(line)) { command = null; continue; }
    if (!command || !/^\s*\|/.test(line)) continue;
    const cell = line.match(/^\s*\|\s*`(--[a-z][a-z0-9-]*)/);
    if (!cell) continue;
    const flag = cell[1].slice(2);
    const declared = await declaredFlags(command);
    if (declared === null) { unspeccedRef.count += 1; continue; }
    if (!declared.has(flag)) {
      problems.push(
        `flag: docs/${lang}/cli-reference.md documents \`--${flag}\` for \`doctrina ${command}\`, ` +
          `which does not declare it (see that command's exported \`flags\`)`,
      );
    }
  }
}

// 10. EN/PT content parity by length ratio.
for (const f of en) {
  if (INFRASTRUCTURE.has(f) || !pt.includes(f)) continue;
  const e = readFileSync(path.join(enDir, f), "utf8").split(/\r?\n/).length;
  const t = readFileSync(path.join(ptDir, f), "utf8").split(/\r?\n/).length;
  const ratio = t / e;
  if (ratio < RATIO_MIN || ratio > RATIO_MAX) {
    problems.push(
      `content-parity: docs/pt/${f} is ${t} lines against docs/en/${f}'s ${e} ` +
        `(ratio ${ratio.toFixed(2)}, outside ${RATIO_MIN}-${RATIO_MAX}) — the pages have diverged`,
    );
  }
}

// 11. The cli-reference documents no command that no longer exists (D3).
//     The suite already checks the FORWARD direction — every catalog
//     operation has a section — which catches a command shipped without
//     docs. It could not catch the reverse: a section surviving a command's
//     removal or rename, which is worse, because a reader following it gets
//     "unknown command" from a page that looks authoritative. Generating the
//     whole reference from the catalog was the other option and was
//     rejected: it is 1,400 lines of hand-written rationale, examples and
//     flag tables that no generator produces, and generated English
//     summaries in the PT copy would break the parity rule above.
for (const lang of ["en", "pt"]) {
  const refPath = path.join(root, "docs", lang, "cli-reference.md");
  if (!existsSync(refPath)) continue;
  const text = readFileSync(refPath, "utf8");
  for (const m of text.matchAll(/^##\s+`(?:npx\s+doctrina-cli|doctrina)\s+([a-z][a-z0-9-]*)/gm)) {
    if (!known.has(m[1])) {
      problems.push(
        `stale: docs/${lang}/cli-reference.md documents \`doctrina ${m[1]}\`, ` +
          "which is not in the command catalog (renamed or removed?)",
      );
    }
  }
}

// 12. A document that states the SIZE of the surface states it correctly
//     (D6, widened by change 0059). The count is the claim most likely to
//     rot — it changes every time an operation ships and nothing reads it.
//     The narrow version of this check looked at the two root READMEs and
//     at the claim form "with N commands" only, which is why four
//     hand-written counts drifted underneath it in four different
//     directions: README.md said 59 operations against 61, docs/en and
//     docs/pt said 33 commands and 50 operations, and README.md dated the
//     ADR set at 0001-0025 with 0026 on disk. The catalog and the decisions
//     directory are the owners; every count in the prose is a copy, so
//     every copy is checked, wherever it lives.
const counts = { commands: COMMAND_NAMES.length, operations: OPERATION_NAMES.length };
const NOUNS = [
  ["commands", counts.commands],
  ["comandos", counts.commands],
  ["operations", counts.operations],
  ["opera\u00e7\u00f5es", counts.operations],
];
// Every ADR on disk, so a documented range can be held to the real one.
const decisionsDir = path.join(root, ".doctrina", "decisions");
const adrNumbers = existsSync(decisionsDir)
  ? readdirSync(decisionsDir)
    .map((f) => /^(\d{4})-/.exec(f)?.[1])
    .filter((n) => n !== undefined)
    .sort()
  : [];
const highestAdr = adrNumbers[adrNumbers.length - 1];

const countedDocs = ["README.md", "README.pt.md",
  ...markdownUnder(path.join(root, "docs")).map((f) => path.relative(root, f))];
for (const rel of countedDocs) {
  const p = path.join(root, rel);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  for (const [noun, actual] of NOUNS) {
    // A bare "<n> commands" is the claim form: a number immediately followed
    // by the noun. Prose that merely mentions a number near the word is not.
    for (const m of text.matchAll(new RegExp(`(\\d+)\\s+${noun}\\b`, "gi"))) {
      if (Number.parseInt(m[1], 10) !== actual) {
        problems.push(
          `count: ${rel} claims ${m[1]} ${noun}, but the catalog has ${actual}`,
        );
      }
    }
  }
  // "the ADRs 0001-0025" / "os ADRs 0001-0026" — a range whose upper bound
  // is not the highest decision on disk is a stale count of the same kind.
  for (const m of highestAdr === undefined ? [] : text.matchAll(/ADRs?\s+0001\s*[\u2013\u2014-]\s*(\d{4})/gi)) {
    if (m[1] !== highestAdr) {
      problems.push(
        `count: ${rel} dates the ADR set at 0001-${m[1]}, but the highest decision on disk is ${highestAdr}`,
      );
    }
  }
}

// 13. Every version stamp quotes packages/doctrina-cli/package.json. The
//     canonical version lives in exactly one place and every other mention
//     is a copy; copies drift. They have drifted to three different values
//     twice now — fixed in 0.10.0 by hand, and found at 0.13.0 / 0.13.0 /
//     0.11.0 while cutting 0.14.0, with every other gate green. The
//     `cut-a-release` skill lists reconciling them as a manual step, which
//     is precisely the kind of step that gets skipped.
const pkgPath = path.join(root, "packages", "doctrina-cli", "package.json");
if (existsSync(pkgPath)) {
  const version = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  for (const stamped of ["README.md", "README.pt.md", "packages/doctrina-cli/README.md"]) {
    const p = path.join(root, stamped);
    if (!existsSync(p)) continue;
    for (const m of readFileSync(p, "utf8").matchAll(/\*\*Status:\*\*\s+v(\d+\.\d+\.\d+)/g)) {
      if (m[1] !== version) {
        problems.push(`version: ${stamped} is stamped v${m[1]}, but the package is ${version}`);
      }
    }
  }
}

  return { problems, unspecced: unspeccedRef.count, enCount: en.length, ptCount: pt.length };
}

// CLI wrapper: run against this repository and report.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { problems, unspecced, enCount, ptCount } = await runChecks(repoRoot);
  for (const p of problems) console.log(`fail  ${p}`);
  if (problems.length === 0) {
    const note = unspecced > 0
      ? ` (${unspecced} flag rows unchecked: command declares no flag spec yet)`
      : "";
    console.log(`ok  docs shape and accuracy clean (${enCount} EN files, ${ptCount} PT files)${note}`);
  } else {
    console.log(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  }
  process.exit(problems.length === 0 ? 0 : 1);
}
