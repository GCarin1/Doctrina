# Tasks — Change 0040-uma-porta-para-o-git-um-lexico

- [x] Implementar `changedFiles(root, {since, untracked, mergeBase})` em `src/lib/git.js`.
- [x] Migrar os call sites de `work`, `review`, `context`, `docs-impact`, `metrics` e `skill`.
- [x] Criar `src/lib/lexicon.js` com `fold`, `terms`, `relevance`, `score`, stopwords EN+PT, `FIX_SHAPED` e o detector de idioma.
- [x] Migrar `work`, `context`, `clarify`, `skill` e `actions` para o léxico compartilhado.
- [x] Teste estrutural: nenhum spawn de git e nenhuma stopword/FIX_SHAPED fora das libs.
- [x] Reescrever os testes de retrieval afetados pela unificação do ranking, e re-capturar a coluna de score nos goldens do playbook.
- [x] Escrever o corpo EARS do delta `specs/cli/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0040-uma-porta-para-o-git-um-lexico/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
