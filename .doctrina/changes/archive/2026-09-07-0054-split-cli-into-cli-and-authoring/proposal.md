# Change 0054-split-cli-into-cli-and-authoring — split cli into cli and authoring

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** cli, authoring

## Why

a spec cli tem 475 linhas contra um cap de 400 e o seu pack ja estoura o teto de contexto omitindo ADRs; dividir pela costura que a propria historia do repo ja usou: a superficie de comandos e as convencoes de um lado, os comandos que autoram artefatos do outro

## What

Divide a spec `cli` em duas capabilities pela costura que a própria história
do repositório já usou duas vezes: a SUPERFÍCIE de um lado, o TRABALHO do
outro.

- `cli` fica com a superfície e as convenções que todo comando compartilha:
  o executável, `--help`/`--version`, os prefixos `error:`/`hint:`, a
  declaração e o parsing de flags, as cinco classes de exit code, o envelope
  JSON, e as portas transversais (git, léxico, log de uso).
- `authoring` (nova) fica com os comandos que ESCREVEM a árvore: `intake`,
  `work`, `spec`, `change`, `decision`, `contract`, `skill`, `intent` e
  `triage`.
- Os blocos de requisito são movidos VERBATIM, como manda a skill
  `split-an-oversized-spec`: nenhuma prosa EARS é reescrita na travessia.
- Delta ADDED em `specs/authoring` com o corpo completo; delta MODIFIED em
  `specs/cli` como merge manual, porque a gramática de ops não tem — de
  propósito — um verbo que remove requisito.

Motivo imediato, e mensurável: a spec `cli` chegou a 475 linhas contra um cap
de 400 e passou a ocupar 8.636 dos 15.000 tokens do próprio pack. Com a
change 0044 arquivada, a 0049 virou a change em foco e o núcleo irredutível
do pack (`AGENTS.md` + `product.md` + a spec + a change em foco) chegou a
13.295 tokens: o `context` passou a omitir ADRs globais e dois testes de
`test/context-retrieval.test.js` — que fixam justamente a invariante "um ADR
sem escopo aparece em TODO pack" — ficaram vermelhos. O próprio comando
imprime a saída: "Split an oversized spec, close a stale change, or raise the
ceiling". Subir o teto é o movimento que o gate de orçamento recusa.

## Scope boundaries

- Nada é reescrito na travessia: mover é mover. Qualquer melhoria de redação
  é outra change.
- Nenhum requisito é apagado para caber no cap — o cap é orçamento de
  leitura, não licença para perder o contrato.
- Não corta nenhum comando: isso é a change 0049, que decide depreciações com
  evidência de uso. Esta change só reorganiza onde os requisitos moram.
- Os requisitos de `validate`/`analyze` que leem o esqueleto de uma change
  ficam onde estão: o sujeito deles é um gate, não um comando de autoria.

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
- [x] Nenhuma das duas specs excede o cap de 400 linhas.
- [x] Nenhum requisito ou critério se perdeu na travessia: a soma bate com o original.
- [x] O pack de `cli` volta a caber com folga e nenhum ADR é omitido.
- [x] `trace --strict` segue verde: a capability nova declara `Realizes:`.

## Open questions

<!-- List unresolved decisions. Empty if none. -->
