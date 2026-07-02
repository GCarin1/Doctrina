#!/usr/bin/env node
// Executable shape check for docs/ — the proof behind the `docs` spec's
// acceptance criteria (.doctrina/specs/docs/spec.md). Zero deps.
//
// Checks:
//   1. docs/en and docs/pt hold identical *.md filename sets (parity).
//   2. Every prose file carries exactly one H1 (infrastructure files —
//      _sidebar.md — are exempt; index.html/.nojekyll/assets are not .md).
//   3. No prose file exceeds the 250-line soft cap. Lookup references
//      (cli-reference.md) are exempt: they are consulted per-section,
//      never read linearly, so the lost-in-the-middle cap does not apply.
//   4. Every PT prose file states near the top that EN is the source.
//   5. README.md links to docs/en/ and README.pt.md links to docs/pt/.
//
// Wired into `doctrina verify` via .doctrina/verify.json. Exits 1 on any
// violation, 0 when clean.
//
// Usage: node scripts/check-docs.js

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const enDir = path.join(root, "docs", "en");
const ptDir = path.join(root, "docs", "pt");

const INFRASTRUCTURE = new Set(["_sidebar.md"]);
const CAP_EXEMPT = new Set(["cli-reference.md"]); // lookup reference, read per-section
const LINE_CAP = 250;

const problems = [];
const mdFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith(".md")).sort();

// 1. EN ↔ PT filename parity, both directions.
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

for (const p of problems) console.log(`fail  ${p}`);
console.log(problems.length === 0
  ? `ok  docs shape clean (${en.length} EN files, ${pt.length} PT files)`
  : `\n${problems.length} problem${problems.length === 1 ? "" : "s"}`);
process.exit(problems.length === 0 ? 0 : 1);
