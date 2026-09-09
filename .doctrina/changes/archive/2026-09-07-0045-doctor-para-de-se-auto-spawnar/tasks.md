# Tasks — Change 0045-doctor-para-de-se-auto-spawnar

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0045-doctor-para-de-se-auto-spawnar`. -->

- [x] Expor `collectValidation()` em `validate.js`, ao lado do padrão que `analyze` já usa.
- [x] Expor coletores puros para o drift de índice e para o lint de checkout limpo.
- [x] Reescrever `doctor.js` para consumir os coletores em processo e remover `runSelf`.
- [x] Testes: sem processo filho, saída idêntica nos três estados.
- [x] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0045-doctor-para-de-se-auto-spawnar/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
