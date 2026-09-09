# Change 0072-o-acoplamento-dos-orcamentos-e-visivel — o acoplamento dos orcamentos e visivel

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** templates

## Why

o AGENTS.md ficou em 149 de 150 linhas e o bloco de superficie em 39 de 40, entao o proximo comando adicionado ao CLI reabre o aviso e o analyze proibe subir o teto, e nada reporta que os dois orcamentos estao acoplados e ambos no limite

## What

O `AGENTS.md` ficou em 149 de 150 linhas e o bloco de superfície gerado em 39 de
40. Um de folga em cada, e os dois estão acoplados: o bloco de superfície é parte
do `AGENTS.md`, então cada comando novo no CLI cresce os dois ao mesmo tempo.

O próximo comando adicionado reabre o aviso que a change 0062 acabou de fechar, e
o `analyze` — corretamente — proíbe a saída de subir o teto, porque
`agents-md-lines` é declarado OUTPUT no contrato. A única saída permitida é
cortar prosa, e não sobra prosa óbvia para cortar.

Nada reporta esse acoplamento. Os dois números vivem no contrato, o
`SURFACE_LINE_BUDGET` vive no código, e ninguém soma os dois para dizer «resta
uma linha». O aviso chega depois do fato, e a change que o disparou não é a
culpada — é só a que passou por último.

## O que o próprio relatório encontrou

Assim que a linha existiu, ela respondeu duas coisas que a proposta supunha:

1. **O teto que aperta não é o do AGENTS.md, é o do bloco.** A folga do
   AGENTS.md era 1 e a do bloco 3, mas a do bloco é a que não tem prosa para
   cortar: cada comando novo do catálogo escreve uma linha lá dentro. Por isso
   a linha reporta o MENOR dos dois, e não o do arquivo.
2. **Um projeto recém-scaffoldado nascia com 149 de 150.** O template do
   AGENTS.md rendia 149 linhas antes de o adotante escrever a primeira linha
   dele — as seções `Stack`, `Commands` e `Repository structure` que o próprio
   template manda preencher não cabiam. O aviso novo dispararia no primeiro
   `doctor` de todo mundo, o que é ruído, não sinal. O template foi cortado
   (a única saída que a direção OUTPUT permite) e agora rende 142.

O `surface-block-lines` também passou a ser declarado no contrato: o
acoplamento só é reportável onde os dois tetos estão declarados.

## Scope boundaries

- Não sobe nenhum dos dois tetos: 150 continua sendo 150, e o `analyze` continua
  recusando quem tentar subi-los para resolver um estouro.
- Não mexe na geração do bloco de superfície.

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
- [x] A folga restante nos dois orçamentos é legível antes de estourar, não depois.
- [x] Um comando novo adicionado ao catálogo diz o que vai custar em linhas.
- [x] O aviso de estouro continua existindo como está, para quem passar por cima.

## Open questions

- Nenhuma.
