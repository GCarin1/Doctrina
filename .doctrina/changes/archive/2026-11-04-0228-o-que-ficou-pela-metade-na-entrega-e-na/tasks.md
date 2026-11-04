# Tasks — Change 0228-o-que-ficou-pela-metade-na-entrega-e-na

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0228-o-que-ficou-pela-metade-na-entrega-e-na` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Manter o fim de linha do arquivo em delivery tick, change tick, carimbo Delivery do work e escritor de cabeçalho da entrega
  - Files: src/lib/fs-ops.js, src/lib/delivery.js, src/commands/{delivery,work,change}.js
  - Verify: node --test packages/doctrina-cli/test/um-arquivo-crlf-continua-crlf.test.js
- [x] Contar só os ticks novos e ler as caixas da Release por um leitor só
- [x] Escrever todo --requirement, --criterion e --op repetidos no change delta (flagAll)
- [x] Mostrar no change check --verbose a spec antes contra a spec depois do apply
- [x] Fazer o review --change ler os deltas da change ao decidir o dono de um arquivo
- [x] Regenerar os arquivos do orquestrador no workspace list e tornar genérica a dica de ferramenta
- [x] Semear o verify --init com os comandos do inventário de código
- [x] Nomear todo subcomando no Usage e descrever toda flag declarada no help
- [x] Mover os requisitos de work --resume --delivery e do prime para authoring e insight e escrever os deltas de core, gates, cli, workspace e docs
- [x] Reescrever multi-agent.md, context-engineering e migration pelo ADR 0030, em EN e PT
- [x] Ordenar o glossário e alinhar o PT ao EN onde tinha derivado
- [x] Documentar as mudanças da 0226 e da 0228 no workspace.md e no cli-reference, em EN e PT
- [x] Executar o guia de ponta a ponta contra o CLI e manter o percurso como teste
- [x] Renderizar todos os diagramas Mermaid na versão que o site carrega
- [x] Rodar a suíte com um TMPDIR por symlink para emular o macOS
- [x] Rodar um agente real pelo fluxo com repositórios sombra
- [x] Atualizar as skills keep-docs-en-pt-parity e add-cli-command e criar read-the-grammar-through-the-document-model
- [x] Ler a change em foco sem os comentários dos templates no pacote de contexto
- [x] Dar dono às cópias exportadas das skills, mover o teste do verify --init para um arquivo próprio e fazer o review ler a spec como a change a deixa
- [x] Explicar a linha Requirement: do cartão no playbook da entrega, no workspace.md e no cli-reference
