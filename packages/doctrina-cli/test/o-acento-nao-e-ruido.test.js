// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { skillSlug, SKILL_SLUG_MAX } from "../src/lib/lexicon.js";
import { draftFromError } from "../src/commands/skill.js";

// AN ACCENT IS A LETTER, NOT NOISE.
//
// The skills module named its files by deleting everything outside
// `[a-z0-9-]` from raw text. That class does not normalise — it destroys:
// A-Z is outside it, so every capital vanished, and each accented letter
// became a hyphen. A real `skill suggest --write` run in this repository
// wrote `.doctrina/skills/o-modelo-de-documento-n-o-l-cabe-alho-de.md`.
//
// The rest of the CLI already folds (`slugify`, `fold`) — the tell is that
// SLUG_NOISE, in the same module that ranks these slugs, lists "nao", a
// token the old pipeline could not produce. The dedup and the noise filter
// were written for folded slugs and were being fed shredded ones.

test("a folded slug keeps the letters a person wrote", () => {
  assert.equal(skillSlug("Corrigir A Validação"), "corrigir-a-validacao");
  assert.equal(skillSlug("não lê o cabeçalho"), "nao-le-o-cabecalho");
  assert.equal(skillSlug("Título Com Acentuação"), "titulo-com-acentuacao");
});

// The skills spec states the filename shape as a requirement:
// `<slug>` matches `[a-z][a-z0-9-]*`. The generator has to honour it, and
// its commonest input is a change id, which starts with four digits.
test("every generated slug starts with a letter", () => {
  const SHAPE = /^[a-z][a-z0-9-]*$/;
  for (const source of [
    "0049-fix-tela-preta-render",
    "0147-modulo-skills-normaliza-nomes",
    "Corrigir A Validação",
    "fix: o close não checa a deriva",
  ]) {
    const slug = skillSlug(source);
    assert.match(slug, SHAPE, `"${source}" produced "${slug}"`);
  }
});

// A slug with nothing left to say still has to name a file.
test("a slug that folds away falls back instead of emptying", () => {
  for (const empty of ["", "   ", "0049", "———", "0001-"]) {
    assert.equal(skillSlug(empty), "lesson", `"${empty}" must not produce an empty filename`);
  }
});

test("the cap trims at a boundary, never leaving a trailing hyphen", () => {
  const slug = skillSlug("uma lição bastante comprida sobre validação de cabeçalho e índice");
  assert.ok(slug.length <= SKILL_SLUG_MAX, `got ${slug.length} chars: ${slug}`);
  assert.doesNotMatch(slug, /-$/);
  assert.match(slug, /^[a-z][a-z0-9-]*$/);
});

// The same fold has to reach the seed tokens, or the name drafted from an
// error carries the shredding one layer deeper than the slug function.
test("a slug drafted from an accented error is readable", () => {
  const draft = draftFromError(
    "ValidationError: o cabeçalho da especificação não confere com o índice\n"
    + "  at .doctrina/specs/skills/spec.md:7",
  );
  assert.ok(draft, "an error with content must draft something");
  assert.match(draft.slug, /^[a-z][a-z0-9-]*$/, `got ${draft.slug}`);
  assert.ok(draft.keywords.includes("especificacao"),
    `the folded word must survive extraction; got ${JSON.stringify(draft.keywords)}`);
  assert.ok(!draft.keywords.includes("especifica"),
    `a truncated stem means the accent broke the match; got ${JSON.stringify(draft.keywords)}`);
});

// Folding is what makes dedup work: an identifier and the same word spelled
// with an accent are one token, so the name does not say it twice.
test("tokens that differ only by fold are deduped once", () => {
  const draft = draftFromError(
    "INDICE mismatch: o indice e o índice divergem; o índice precisa de rebuild",
  );
  assert.ok(draft);
  const parts = draft.slug.split("-");
  assert.equal(new Set(parts).size, parts.length, `repeated token in ${draft.slug}`);
});
