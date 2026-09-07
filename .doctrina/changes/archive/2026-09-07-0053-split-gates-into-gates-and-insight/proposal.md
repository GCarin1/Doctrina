# Change 0053-split-gates-into-gates-and-insight — split gates into gates and insight

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

a spec gates tem 424 linhas contra um cap de 400 e sozinha ocupa 65% do pack de contexto, forcando cada change a encolher o proprio delta; dividir pela costura que o proprio Purpose ja descreve: os gates que decidem se a arvore e honesta, e os comandos de leitura que montam contexto e insight

## What

Divide a spec `gates` em duas capabilities pela costura que o próprio Purpose dela
já descrevia: um GATE lê a árvore para poder RECUSAR; uma VISTA monta o que existe
e não recusa nada. As duas leem a mesma árvore e respondem perguntas diferentes.

- `gates` fica com os checks (`validate`, `coverage`, `trace`, `verify`, `review`,
  `analyze`, `clarify`) e os drivers que os sequenciam (`close`, `doctor`, a action).
- `insight` (nova) fica com a montagem do pack de contexto e os comandos de leitura
  (`context`, `search`, `show`, `status`, `prime`, `handoff`, `report`, `why`,
  `constitution`).
- Os blocos de requisito são movidos VERBATIM, como manda a skill
  `split-an-oversized-spec`: nenhuma prosa EARS é reescrita na travessia.

Motivo imediato: a spec `gates` chegou a 424 linhas contra um cap de 400 e passou a
ocupar 65% do pack de contexto da própria capability, empurrando o pack ao teto de
15.000 tokens e fazendo o `context` omitir ADRs. As três changes anteriores tiveram
que encolher os próprios deltas para caber — tratar o sintoma. O cap é um orçamento
de leitura, e a resposta que o repo prescreve é cortar pela costura, não subir o
número.

## Scope boundaries

- Nada é reescrito na travessia: mover é mover. Qualquer melhoria de redação é outra change.
- Nenhum requisito é apagado para caber no cap — o cap é orçamento de leitura, não licença para perder o contrato.
- Não mexe na spec `cli` (também acima do cap); essa é uma divisão própria, com a sua própria costura.

## Scope boundaries

<!-- Anything adjacent that this change deliberately does NOT touch. -->

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

<!-- List unresolved decisions. Empty if none. -->
