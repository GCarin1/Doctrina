#!/usr/bin/env node
// Executable check for docs/ — the proof behind the `docs` spec's
// acceptance criteria (.doctrina/specs/docs/spec.md). Zero deps.
//
// Two families of check. SHAPE (1-5) asks "is this file laid out right?".
// ACCURACY (6-10) asks "is what it says true?" — the family that was
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
//
// Wired into `doctrina verify` via .doctrina/verify.json. Exits 1 on any
// violation, 0 when clean.
//
// Usage: node scripts/check-docs.js

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES } from "../packages/doctrina-cli/src/lib/commands.js";
import { declaredFlags } from "../packages/doctrina-cli/src/lib/flag-catalog.js";

const INFRASTRUCTURE = new Set(["_sidebar.md"]);
const CAP_EXEMPT = new Set(["cli-reference.md"]); // lookup reference, read per-section
const LINE_CAP = 250;
// EN is the source; a translation runs a little longer in Portuguese. Outside
// this band the two pages are no longer saying the same thing.
const RATIO_MIN = 0.75;
const RATIO_MAX = 1.30;

const mdFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith(".md")).sort();

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

for (const [dir, files, isPt] of [[enDir, en, false], [ptDir, pt, true]]) {
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
