import { test } from "node:test";
import assert from "node:assert/strict";
import { substitute, discoverTokens } from "../src/lib/templates.js";

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
