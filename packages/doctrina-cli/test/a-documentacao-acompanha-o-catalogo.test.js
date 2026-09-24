// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPRECATED, OPERATIONS, REMOVED } from "../src/lib/commands.js";

// THE DOCUMENTATION FOLLOWS THE CATALOG, NOT THE OTHER WAY ROUND.
//
// Change 0179 found the prose behind the CLI in three ways a check could
// have caught: the npm README's hand-kept command list had lost `close`,
// `prime`, `status` and a dozen more; pages taught a deprecated name as the
// way to do something; and the docs home walked a reader through a manual
// apply/archive with "MODIFIED deltas are merged by hand", two releases
// after `ops` blocks made them mechanical. The first two are mechanical,
// so they are checked here.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const read = (rel) => readFileSync(path.join(repo, rel), "utf8");

test("the npm README's command summary names every live operation", () => {
  const readme = read("packages/doctrina-cli/README.md");
  const start = readme.indexOf("Bootstrap   ");
  assert.ok(start > 0, "the moment-grouped summary is present");
  const block = readme.slice(start, readme.indexOf("```", start));
  const missing = OPERATIONS
    .filter(([op]) => !DEPRECATED[op])
    .map(([op]) => op)
    .filter((op) => {
      const [cmd, sub] = op.split(" ");
      const re = sub
        ? new RegExp(`\\b${cmd} (?:[a-z-]+\\|)*${sub}(?:\\|[a-z-]+)*\\b`)
        : new RegExp(`(^|[ ·])${cmd}( |$| ·)`, "m");
      return !re.test(block);
    });
  assert.deepEqual(missing, []);
});

// A page may NAME a retired command — to say it is deprecated, removed, or
// what it became — but it must not teach it as the way to do something.
test("no page teaches a deprecated or removed command outside the lines that retire it", () => {
  const retired = [...Object.keys(DEPRECATED), ...Object.keys(REMOVED)];
  const pages = ["README.md", "README.pt.md", "packages/doctrina-cli/README.md",
    ...["en", "pt"].flatMap((lang) => {
      const dir = path.join(repo, "docs", lang);
      return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => `docs/${lang}/${f}`) : [];
    })];
  const retiring = /deprecated|depreciado|removed|removido|alias|formerly|antes |until 0\.|até a 0\.|since 0\.17|desde 0\.17|## `doctrina/i;
  const offenders = [];
  for (const page of pages) {
    const lines = read(page).split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const op of retired) {
        if (!new RegExp(`doctrina ${op}(?![a-z-])`).test(line)) continue;
        // The retiring note may sit on the line or in the blockquote/heading
        // just above it.
        const context = lines.slice(Math.max(0, i - 12), i + 1).join("\n");
        if (!retiring.test(context)) offenders.push(`${page}:${i + 1} doctrina ${op}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});
