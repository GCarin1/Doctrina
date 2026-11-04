# Tasks — Change 0229-o-intake-absorve-projetos-complexos-sem

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0229-o-intake-absorve-projetos-complexos-sem` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Ler cada unidade do repositório no inventário, com linguagem, frameworks, gerenciador de pacotes e testes
  - Files: packages/doctrina-cli/src/lib/code-inventory.js
  - Verify: node --test packages/doctrina-cli/test/o-intake-le-o-projeto-inteiro.test.js
- [x] Apontar áreas por unidade, pontos de entrada, interfaces, dados, entrega, documentação existente e o que não foi visto
- [x] Semear no verify --init só comandos que terminam sozinhos, com cwd por unidade
- [x] Escrever no absorb e no bootstrap as regras contra inventar e a checagem dos fatos
- [x] Medir o inventário em sete projetos públicos (polyglot, full-stack, monorepos, Spring, .NET, Django) e corrigir cada distorção
- [x] Rodar um agente real absorvendo o projeto poliglota e conferir os requisitos contra o código
- [x] Documentar em cli-reference e brownfield, EN e PT
