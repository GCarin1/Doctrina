# Change 0259-consoles-que-se-comunicam — consoles que se comunicam

- **Status:** applied
- **Applied:** 2026-11-13
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** console


## Why

Quem trabalha em mais de um repositório tem um terminal por repositório. Com um console em cada, eram conversas que não se ouviam — e o planejador na raiz do workspace (ADR 0030) não tinha a quem entregar um cartão, a não ser ao humano, redigitando. O pedido foi um modo orquestrador em que os terminais abertos se comunicam.

## What

- `lib/console-room.js`: a sala — a do workspace (raiz e repositórios registrados) ou a do diretório — como arquivos em `$DOCTRINA_HOME/rooms/`: um cartão por console (vivo enquanto é reescrito), uma caixa de entrada por console, mensagens lidas uma vez.
- No console: `/peers` lista os outros, `/send <nome> <pedido>` (ou `all`) entrega um pedido, `/listen off|on` deixa de ouvir; quem recebe mostra de quem veio, entrega ao próprio agente, enfileira se estiver ocupado e devolve a última mensagem do agente como relatório; recusas voltam com o motivo.
- O cabeçalho conta os consoles (`↔ 2`), o painel os lista, a caixa mostra `for <console>` enquanto atende.
- `doctrina ui --send <nome> "<pedido>" [--timeout <s>]` entrega de fora de um console e espera o relatório — é o que o agente do planejador roda; `doctrina ui --peers` lista a sala; `ui --json` inclui `peers`.
- O agente é avisado dos consoles abertos; um pedido entregue não é repassado (`--send` recusa sob ele).
- Comandos do próprio console respondem enquanto ele trabalha.
- ADR 0033, política de segurança, docs EN/PT, READMEs, CHANGELOG.

## Scope boundaries

Não há porta, socket nem daemon: a sala é uma pasta lida a cada segundo. O relatório não é devolvido automaticamente ao agente de quem pediu; ele é mostrado ao humano, e o agente que o quer dentro do próprio turno usa `--send`. A sala não impede dois consoles no mesmo repositório. Consoles em máquinas diferentes não se enxergam.

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

<!-- doctrina:applied-deltas specs/console/delta.md=0b67cb45,d4af005c,39e28196,80149ef7,64a49bc4,dfea3648,15ec956d,03094226,869d4681,b167dfda,bbd0ae99,1cf99a8a,7b009689,049d223f,d0f866c6,39289bf9,10659efb,d90b5a5b -->
