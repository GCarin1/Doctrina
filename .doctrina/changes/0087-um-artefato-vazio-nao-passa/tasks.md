# Tasks — Change 0087-um-artefato-vazio-nao-passa

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir a tabela: esvaziar cada tipo de artefato e registrar o veredicto atual.
- [ ] Reportar um artefato registrado no índice cujo arquivo não carrega estrutura nenhuma.
- [ ] Conferir que a checagem existente de header contra índice passa a cobrir a ausência do header.
- [ ] Teste: cada tipo de artefato vazio é pego, e a árvore bem formada continua limpa.
- [ ] Escrever o corpo EARS do delta `specs/validation`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0087-um-artefato-vazio-nao-passa/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
