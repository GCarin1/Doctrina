// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasDetectableTrigger } from "../src/lib/validation-model.js";

// VAGUENESS IS WRITTEN IN THE PROJECT'S OWN LANGUAGE.
//
// `context` ranks skills by matching a task against the `when:` trigger, so a
// trigger naming nothing concrete can never fire and the skill loads only for
// someone who already knew it existed. The check for that saw English only:
// one hardcoded phrase list, and a private stop list of English function
// words. In a Portuguese project — which this framework supports, detects per
// file, and documents in both languages — "quando fizer sentido" and "sempre
// que parecer útil" sailed through as concrete triggers, and Portuguese
// grammar words like "quando" and "que" counted as distinctive, so a two-word
// phrase cleared the rankability bar on function words alone.
//
// Change 0158 found the same split in `clarify`'s lexicons. This is it one
// module over, and the fix is the same: mirrored lists, and the SHARED
// lexicon — which already carries both languages — counting the content words.

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, "..", "src");

const VAGUE_EN = [
  "whenever it seems relevant",
  "when it feels right",
  "when it makes sense",
  "as needed",
  "if needed",
  "when appropriate",
];
const VAGUE_PT = [
  "quando fizer sentido",
  "quando for relevante",
  "se necessário",
  "se necessario",
  "sempre que parecer útil",
  "quando achar apropriado",
  "quando parecer certo",
];

test("a vague trigger is vague in English", () => {
  for (const w of VAGUE_EN) {
    assert.equal(hasDetectableTrigger(w), false, `"${w}" names nothing to match on`);
  }
});

test("and a vague trigger is vague in Portuguese", () => {
  for (const w of VAGUE_PT) {
    assert.equal(hasDetectableTrigger(w), false,
      `"${w}" names nothing to match on — the language does not change that`);
  }
});

// Accents cannot be the difference: the phrase is matched folded.
test("an accent does not decide whether a trigger is vague", () => {
  assert.equal(hasDetectableTrigger("se necessário"), hasDetectableTrigger("se necessario"));
  assert.equal(hasDetectableTrigger("sempre que parecer útil"),
    hasDetectableTrigger("sempre que parecer util"));
});

test("a concrete trigger passes in either language", () => {
  for (const w of [
    'the task hits "AXE_SEVERITY"',
    "work touches src/billing/invoice.js",
    "a tarefa toca src/carteira.js",
    'o erro diz "saldo negativo"',
    "work touches billing invoices",
    "a tarefa fala de preco medio de ativo",
    // A vague WORD inside a concrete sentence is not a vague trigger: the
    // phrase list is anchored, it does not scan for keywords.
    "the error says right-to-left rendering broke",
  ]) {
    assert.equal(hasDetectableTrigger(w), true, `"${w}" names something a task can match`);
  }
});

test("the scaffold's own placeholder and an empty trigger still fail", () => {
  assert.equal(hasDetectableTrigger("<when this fires>"), false);
  assert.equal(hasDetectableTrigger(""), false);
  assert.equal(hasDetectableTrigger(undefined), false);
});

// The rankability floor must count CONTENT words. Counting raw words with an
// English stop list is what let Portuguese grammar clear the bar.
test("Portuguese function words do not count as distinctive", () => {
  // Two grammar words and nothing else: rankable by neither lexicon.
  assert.equal(hasDetectableTrigger("quando o que"), false);
  assert.equal(hasDetectableTrigger("para com isso"), false);
});

// One lexicon, the way `work` and `context` already read text.
test("the check reads text through the shared lexicon", () => {
  const source = readFileSync(path.join(srcDir, "lib", "validation-model.js"), "utf8");
  assert.match(source, /from "\.\/lexicon\.js"/,
    "the stop list belongs to the lexicon every other reader shares");
  const fn = /export function hasDetectableTrigger[\s\S]*?\n}/.exec(source)?.[0] ?? "";
  assert.ok(fn, "precondition: the function is readable");
  assert.doesNotMatch(fn, /const STOP = new Set/,
    "a private stop list is how one language got a different answer");
});
