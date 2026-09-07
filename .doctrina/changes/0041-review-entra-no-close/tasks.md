# Tasks — Change 0041-review-entra-no-close

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0041-review-entra-no-close`. -->

- [ ] Adicionar `review` à sequência do `close`, antes do `apply`, no nível consultivo.
- [ ] Escopar o review ao diff da change em fechamento.
- [ ] Garantir que uma falha do review não altera o código de saída do close.
- [ ] Mencionar o passo no playbook do `work` (ou no template, se a change 0038 já aterrissou).
- [ ] Teste: change com código tocado e spec parada aparece no relatório e o close segue.
- [ ] Atualizar `docs/en/gating.md` e `docs/pt/gating.md`.
- [ ] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0041-review-entra-no-close/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
