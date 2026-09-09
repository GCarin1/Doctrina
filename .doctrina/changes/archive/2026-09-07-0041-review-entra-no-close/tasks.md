# Tasks — Change 0041-review-entra-no-close

- [x] Adicionar `review` à sequência declarada do `close`, antes do `apply`, no nível consultivo.
- [x] Escopar o review ao diff da change em fechamento (a árvore de trabalho, que no close É esse diff).
- [x] Garantir que uma falha do review não altera o código de saída do close.
- [x] Mencionar o passo no template do playbook do `work` (a change 0038 já aterrissou).
- [x] Teste: change com código tocado e spec parada aparece no relatório e o close segue.
- [x] Atualizar `docs/en/gating.md`, `docs/pt/gating.md` e a sequência na referência de CLI (EN + PT).
- [x] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0041-review-entra-no-close/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
