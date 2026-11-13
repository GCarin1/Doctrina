# Change 0254-um-requisito-que-e-invariante-pede-um-teste-de — um requisito que e invariante pede um teste de propriedade

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-12
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: change, criterio)
- **Affects specs:** gates


## Why

Um requisito como "o sistema nunca deve emitir um código já em uso" afirma algo de toda entrada. O critério dele citava um teste de exemplo — três entradas em que alguém pensou — e o coverage chamava isso de provado. O Kiro gera testes de propriedade a partir do EARS com um modelo; a CLI não tem modelo e não precisa de um para as duas metades determinísticas: dizer quais requisitos se leem como invariantes, e só contar um critério marcado `[property]` quando o teste que ele cita gera as próprias entradas.

## What

- `lib/properties.js`: reconhece a biblioteca de propriedade de um arquivo de teste (Hypothesis, fast-check, jqwik, proptest, quickcheck, rapid, FsCheck, ScalaCheck), lê os requisitos de uma spec e a forma que as palavras sugerem (ida e volta, idempotência, limite, unicidade, ordem, invariante), em inglês e português.
- Marca de critério `[property]`: o coverage reporta `unguarded` quando nenhum teste citado gera entradas, e isso falha o `--strict`.
- `doctrina coverage --properties`: a lista de candidatos por capability, a biblioteca que o manifesto do projeto aponta, e o comando para reivindicar. Sai 0.
- `doctrina change delta --property "…"` escreve o critério marcado; `--requirement` avisa quando o requisito escrito é um invariante.
- Docs EN/PT (referência), CHANGELOG.

## Scope boundaries

A CLI não gera o teste e não o executa (o `coverage --run` já executa a evidência citada). A lista de candidatos é uma leitura das palavras, não um gate: nenhum requisito é obrigado a ter uma propriedade. O reconhecimento da biblioteca é por texto do arquivo de teste.

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

## Open questions

Nenhuma.

<!-- doctrina:applied-deltas specs/gates/delta.md=718bd10e,64ed5d6f,949f649b,ccfb7d06,51f38831,1aceedac,d90b5a5b -->
