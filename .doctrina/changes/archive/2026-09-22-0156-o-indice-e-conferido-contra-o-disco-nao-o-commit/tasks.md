# Tasks — Change 0156-o-indice-e-conferido-contra-o-disco-nao-o-commit

- [x] Coletar a deriva entre o index staged e a árvore staged, lendo por
      git plumbing e não do disco.
- [x] Expor isso como `index rebuild --check --staged`, que nunca escreve.
- [x] Fazer o hook de pre-commit perguntar isso depois do passo que faz
      `git add` do index.
- [x] Documentar a flag em EN e PT e provar o caso real num teste.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-22-0156-o-indice-e-conferido-contra-o-disco-nao-o-commit/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
