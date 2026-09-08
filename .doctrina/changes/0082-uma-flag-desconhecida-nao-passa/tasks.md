# Tasks — Change 0082-uma-flag-desconhecida-nao-passa

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir o dano: `coverage --strict` sai 1 e `coverage --stricts` sai 0 na mesma árvore.
- [ ] Recusar no entrypoint toda flag ausente da declaração do comando, com exit 2 e o nome da flag.
- [ ] Aproveitar o `suggest` que o CLI já usa para subcomando e propor a flag certa num typo.
- [ ] Conferir comando a comando que nenhuma flag hoje aceita passou a ser recusada.
- [ ] Teste: a flag inventada é recusada, a declarada passa, e o typo sugere a correta.
- [ ] Escrever o corpo EARS do delta `specs/cli`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0082-uma-flag-desconhecida-nao-passa/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
