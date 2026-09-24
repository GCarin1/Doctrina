// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
//
// Change 0185 widened "a page" past the READMEs and `docs/`: the audit
// after 0182 found CONTRIBUTING.md, the PR template, an example project,
// two skills and product.md still teaching `analyze` — and the contributor
// rules forbidding the change workflow the repository has run on itself
// since ADR 0014. Everything a person or an agent reads for instructions
// is a page: the templates a project is scaffolded from included.

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

// Every file under `rel` (recursively) whose name passes `keep`.
function filesUnder(rel, keep) {
  const root = path.join(repo, rel);
  if (!existsSync(root)) return [];
  const out = [];
  for (const name of readdirSync(root)) {
    if (name === "node_modules" || name === ".git") continue;
    const child = `${rel}/${name}`;
    if (statSync(path.join(repo, child)).isDirectory()) out.push(...filesUnder(child, keep));
    else if (keep(name)) out.push(child);
  }
  return out;
}
const md = (name) => name.endsWith(".md");

// Every page a person or an agent reads for instructions.
function pages() {
  return [
    "README.md", "README.pt.md", "CONTRIBUTING.md", "AGENTS.md",
    "packages/doctrina-cli/README.md", ".doctrina/product.md",
    ...filesUnder("docs/en", md), ...filesUnder("docs/pt", md),
    ...filesUnder(".github", md),
    ...filesUnder(".doctrina/skills", md),
    ...filesUnder(".doctrina/templates", (n) => n.endsWith(".template")),
    ...filesUnder(".claude/commands", md), ...filesUnder(".cursor/commands", md),
    ...readdirSync(path.join(repo, "examples"))
      .flatMap((ex) => ["AGENTS.md", "README.md", "CLAUDE.md"].map((f) => `examples/${ex}/${f}`))
      .filter((f) => existsSync(path.join(repo, f))),
  ];
}

// A page may NAME a retired command — to say it is deprecated, removed, or
// what it became — but it must not teach it as the way to do something.
test("no page teaches a deprecated or removed command outside the lines that retire it", () => {
  const retired = [...Object.keys(DEPRECATED), ...Object.keys(REMOVED)];
  const retiring = /deprecated|depreciado|removed|removido|alias|formerly|antes |until 0\.|até a 0\.|since 0\.17|desde 0\.17|## `doctrina/i;
  const offenders = [];
  for (const page of pages()) {
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

test("the pages the guard reads include the ones outside docs/", () => {
  const read = pages();
  for (const page of ["CONTRIBUTING.md", ".github/PULL_REQUEST_TEMPLATE.md", ".doctrina/product.md",
    ".doctrina/skills/stage-a-change-backlog.md", "examples/python-fastapi-urls/AGENTS.md",
    ".doctrina/templates/playbooks/work.md.template"]) {
    assert.ok(read.includes(page), `${page} is not read`);
  }
});

// The contributor rules said framework work is committed directly and the
// archive "must stay empty"; the repository closes every change with
// `doctrina close` and the archive is its history.
test("the contributor pages describe the workflow the repository runs", () => {
  for (const page of ["CONTRIBUTING.md", "docs/en/contributing.md", "docs/pt/contributing.md",
    ".github/PULL_REQUEST_TEMPLATE.md"]) {
    const text = read(page);
    assert.match(text, /doctrina close/, `${page} does not name the close`);
    assert.doesNotMatch(text, /must stay empty|deve ficar vazio|No change folder was created/i, page);
  }
});

// A test project's AGENTS.md sat under packages/doctrina-cli/ for months;
// an agent reading the nearest AGENTS.md got its rules.
test("an AGENTS.md lives only at the root and in the example projects", () => {
  const found = filesUnder(".", (n) => n === "AGENTS.md").map((f) => f.replace(/^\.\//, ""))
    .filter((f) => f !== "AGENTS.md" && !/^examples\/[^/]+\/AGENTS\.md$/.test(f));
  assert.deepEqual(found, []);
});
