# Tasks — Change 0096-o-ledger-registra-o-que-aconteceu

- [x] `enforceTransition` devolve `{ ok, forced }` em vez de gravar.
- [x] `apply` regista a lacuna só quando escreveu sem erros.
- [x] `archive` regista a lacuna só depois de mover a pasta.
- [x] Testes: force que falha, force que passa, archive forçado, transição limpa.
- [x] Reescrever o teste de paridade que fixava a gravação incondicional.
- [x] Escrever o corpo EARS do delta `specs/authoring/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
