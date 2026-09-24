// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// THE README IS THE DOOR: IT SAYS HOW TO INSTALL, AND IT REACHES EVERY GUIDE.
//
// The README described the framework for 180 lines and never said how to
// install it — the command lived one click away, in getting-started. Its
// documentation list had come apart (three guides stranded after the
// "Project policy" line), and seven guides were not linked at all,
// `exit-codes` and `upgrading` among them. Both languages, in parity.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");

// Not guides a reader picks from the list: the docs site's own index and
// navigation, the contributor guide (linked as CONTRIBUTING.md), and the
// sponsorship page.
const EXEMPT = new Set(["README.md", "_sidebar.md", "contributing.md", "donations.md"]);

for (const [readme, lang] of [["README.md", "en"], ["README.pt.md", "pt"]]) {
  const text = readFileSync(path.join(repo, readme), "utf8");

  test(`${readme} says how to install, before anything else`, () => {
    const install = text.indexOf("npm install -g doctrina-cli");
    assert.ok(install > 0, "the install command is in the README itself");
    assert.ok(install < text.indexOf("```mermaid"), "and it comes before the flow diagram");
  });

  test(`${readme} links every ${lang} guide`, () => {
    const missing = readdirSync(path.join(repo, "docs", lang))
      .filter((f) => f.endsWith(".md") && !EXEMPT.has(f))
      .filter((f) => !text.includes(`(./docs/${lang}/${f}`) && !text.includes(`(docs/${lang}/${f}`));
    assert.deepEqual(missing, [], `unlinked from ${readme}`);
  });

  test(`${readme} keeps its documentation list in one piece`, () => {
    const policy = text.split(/\r?\n/).findIndex((l) => /^(Project policy|Política do projeto):/.test(l));
    assert.ok(policy > 0);
    const next = text.split(/\r?\n/)[policy + 1] ?? "";
    assert.doesNotMatch(next, /^- \[/, "no guide stranded after the policy line");
  });
}
