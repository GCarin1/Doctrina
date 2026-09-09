# Change 0113-uma-spec-fora-do-caminho-e-apontada — uma spec fora do caminho e apontada

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates

## Why

uma spec em .doctrina/specs/legacy.md, uma pasta de capability sem spec.md e um spec-old.md são invisíveis para validate e index rebuild

## What

O AGENTS.md exige o nome exato `proposal.md` para uma change, e `validate`
dá `error` quando falta. Para specs, o mesmo erro de caminho é silêncio.
Medido:

```
.doctrina/specs/legacy.md            (uma spec inteira, no lugar errado)
.doctrina/specs/orfao/notes.md       (pasta de capability sem spec.md)
.doctrina/specs/carteira/spec-old.md (segunda spec dentro da pasta)
index rebuild → nada · validate → ok 0 errors
```

Nenhum dos três é artefato para a CLI: não é indexado, não entra em pack,
não conta na cobertura, não traça. Uma spec escrita à mão no caminho errado
simplesmente não existe, e nada diz isso.

`validate` passa a avisar: um `.md` solto em `.doctrina/specs/`; uma pasta
de capability sem `spec.md`; e um `.md` extra dentro de uma pasta de
capability cujo título começa por `# Spec` — cada um com o caminho onde a
spec deveria estar.

## Scope boundaries

- Nível `warning`: um arquivo de notas dentro da pasta de uma capability é
  legítimo; só um que se apresenta como spec é apontado.
- Não move nem renomeia nada.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Os três casos geram um `warning` do `validate` cada, com o caminho canônico na mensagem.
- [x] Um `notes.md` dentro de uma pasta com `spec.md` não avisa.

## Open questions

- Nenhuma.
