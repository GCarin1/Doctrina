# Change 0200-review-do-close-olha-a-change — review do close olha a change

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** gates


## Why

Uma review de campo da 0.17 (85 changes) disse: "todo fechamento avisa que
as specs de health, squads, cloud… mudaram sem atualização, mesmo quando a
change não tocou nelas". Reproduzido num projeto simulado, com duas causas:

1. O review roda no close ANTES do `apply`, e só um `spec.md` editado contava
   como atualização — a capability que a change estava atualizando pelo delta
   era sempre acusada.
2. A posse somava todo sinal de toda spec: um arquivo reivindicado pelo
   `**Source:**` de `health` também "pertencia" a `cloud` porque a spec de
   cloud mencionava um `index.js` — contra a própria requisição da spec de
   gates ("never infer ownership over a declaration").

E o que ficava fora da change saía como uma quebra por capability, repetida
em todo close.

## What

- `rankCapabilitiesByDiff` (lib/work-model.js): por arquivo, vence a resposta
  mais forte — Source declarado; senão citação do caminho exato; senão a
  inferência, só de specs que não declaram Source.
- `review --change <id>`: os deltas da change contam como atualização; o
  código sob capabilities sem delta vira UMA linha.
- `close` roda o review com `--change <id>`; `deltaCapabilities` em
  lib/scan.js serve os dois.
- Teste `o-review-do-close-olha-a-change.test.js`; docs EN/PT; CHANGELOG.

## Scope boundaries

- O review sem `--change` mantém a forma de uma quebra por capability.
- Não grava baseline da change: o review não tem como separar o trabalho
  sujo de outra sessão do esquecimento de um delta, e diz as duas coisas.

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
