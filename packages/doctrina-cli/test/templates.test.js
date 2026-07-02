import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { substitute, discoverTokens } from "../src/lib/templates.js";

// The canonical template tree (the CLI's `prepack` copies it into the
// package). Tests that walk it are skipped in a packed tarball checkout.
const templatesRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".doctrina", "templates",
);

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

test("substitute replaces all token occurrences", () => {
  const text = "Hello {{NAME}}, today is {{DATE}}. {{NAME}} again.";
  const out = substitute(text, { NAME: "Doctrina", DATE: "2026-06-03" });
  assert.equal(out, "Hello Doctrina, today is 2026-06-03. Doctrina again.");
});

test("substitute leaves unknown tokens untouched", () => {
  const out = substitute("Hi {{NAME}}, {{UNKNOWN}}.", { NAME: "x" });
  assert.equal(out, "Hi x, {{UNKNOWN}}.");
});

test("substitute ignores lowercase placeholders", () => {
  const out = substitute("{{name}} {{NAME}}", { NAME: "doctrina", name: "doctrina" });
  assert.equal(out, "{{name}} doctrina");
});

test("discoverTokens returns sorted unique uppercase tokens", () => {
  const tokens = discoverTokens("{{B}} {{A}} {{A}} {{C_1}}");
  assert.deepEqual(tokens, ["A", "B", "C_1"]);
});

// The template inventory the `templates` spec declares must exist on disk —
// `init` and the `new` commands scaffold from these exact paths, so a missing
// file is a runtime failure waiting for the first user to hit that path.
test("the shipped template tree matches the spec inventory", () => {
  if (!existsSync(templatesRoot)) return; // packed tarball without the repo tree
  const required = [
    "AGENTS.md.template", "spec.md.template", "spec-bug.md.template",
    "skill.md.template", "decision.md.template", "contract.md.template",
    "change/proposal.md.template", "change/tasks.md.template",
    "change/design.md.template", "change/spec-delta.md.template",
    "doctrina/product.md.template", "doctrina/index.json.template",
    "hooks/pre-commit.sample", "hooks/watch.sample",
    "README.md",
  ];
  for (const rel of required) {
    assert.ok(existsSync(path.join(templatesRoot, rel)), `missing template: ${rel}`);
  }
  const agents = ["claude", "codex", "cursor", "copilot", "gemini", "aider",
    "windsurf", "continue", "amp", "devin", "factory", "jules"];
  for (const a of agents) {
    assert.ok(existsSync(path.join(templatesRoot, "adapters", a)), `missing adapter dir: ${a}`);
  }
});

// Every shipped .template must carry at least one {{TOKEN}} placeholder, and
// only tokens the templates README documents — the substitution contract the
// `templates` spec declares (its acceptance criteria #2 and #4).
test("every shipped .template carries only canonical, documented tokens", () => {
  if (!existsSync(templatesRoot)) return;
  const canonical = new Set(discoverTokens(readFileSync(path.join(templatesRoot, "README.md"), "utf8")));
  const files = walkFiles(templatesRoot).filter((f) => f.endsWith(".template"));
  assert.ok(files.length >= 15, `expected a real template tree, found ${files.length} files`);
  for (const f of files) {
    const rel = path.relative(templatesRoot, f);
    const tokens = discoverTokens(readFileSync(f, "utf8"));
    assert.ok(tokens.length >= 1, `${rel} has no {{TOKEN}} placeholder`);
    for (const t of tokens) {
      assert.ok(canonical.has(t), `${rel} uses {{${t}}}, undocumented in templates README.md`);
    }
  }
});
