# Tasks — Change 0040-uma-porta-para-o-git-um-lexico

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0040-uma-porta-para-o-git-um-lexico`. -->

- [ ] Implementar `changedFiles(root, {since, untracked, mergeBase})` em `src/lib/git.js`.
- [ ] Migrar os call sites de `work`, `review`, `context`, `docs-impact`, `coverage`, `skill`, `report` e `verify`.
- [ ] Criar `src/lib/lexicon.js` com `fold`, `terms`, `relevance`, stopwords EN+PT e `FIX_SHAPED`.
- [ ] Migrar `work`, `context`, `search`, `triage` e `skill` para o léxico compartilhado.
- [ ] Teste estrutural: nenhum `spawnSync` de git e nenhuma stopword fora das libs.
- [ ] Reescrever os testes de retrieval afetados pela unificação do ranking.
- [ ] Escrever o corpo EARS do delta `specs/cli/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0040-uma-porta-para-o-git-um-lexico/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
