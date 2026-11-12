# Change 0256-onboarding-guiado — onboarding guiado

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-12
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: change, implementar)
- **Affects specs:** insight, scaffolding, templates, cli


## Why

Quem chega ao Doctrina tinha uma referência de 2.900 linhas, uma página de primeiros passos e o `next`, que nomeia uma ação e supõe que o leitor sabe por quê. Nada conduzia o ciclo inteiro uma vez. O OpenSpec tem um `onboard` que faz isso com o modelo narrando sobre o código real do usuário; aqui a CLI lê em que passo o projeto está e imprime o roteiro — o que cada passo é, o que rodar, o que dizer ao humano e onde perguntar — e o agente é o guia.

## What

- `lib/onboard.js`: o estado lido da árvore (instalado, specs, intake pendente, change aberta/planejada/marcada, changes arquivadas), os seis passos e as candidatas a primeira tarefa (critério sem prova; marcador de pendência deixado num arquivo de código rastreado).
- `doctrina onboard [--json]`: imprime os passos com ✓/→, o passo atual com `Tell the human`, `ASK` e os comandos; funciona antes do `init`; com tudo feito, imprime o tour para quem chega.
- Skills `/doctrina-onboard` nos adapters `claude` e `cursor`; `doctrina init` aponta para o comando (e a dica de código existente passa a nomear `intake --from-code`).
- `doctrina upgrade --write` entrega a um adapter já instalado o arquivo do core loop que a CLI passou a trazer.
- Catálogo (`OPERATIONS`, ajuda, hub), docs EN/PT (referência, primeiros passos, adapters), READMEs (40 comandos, 78 operações), CHANGELOG.

## Scope boundaries

O `onboard` não executa nenhum passo nem guarda progresso: lê a árvore a cada chamada. As candidatas são sugestões; quem escolhe é o humano. Na raiz de um workspace ele descreve o diretório como qualquer outro. O `upgrade` não acrescenta arquivos de adapter dentro de uma sombra de workspace.

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

<!-- doctrina:applied-deltas specs/cli/delta.md=5d85480d,e7c38c12 specs/insight/delta.md=0606c573,3f4b54cd,6e240566,b3ad204e,4cfad59e,cca54f61,02762ed8,8607c0b9,d90b5a5b specs/scaffolding/delta.md=8dfbebe7,17bf2af3,d90b5a5b specs/templates/delta.md=e7c38c12 -->
