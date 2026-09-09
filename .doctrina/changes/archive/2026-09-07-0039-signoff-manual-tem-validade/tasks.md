# Tasks — Change 0039-signoff-manual-tem-validade

- [x] Estender o formato do registro com `sha` e `paths`, mantendo leitura do formato antigo.
- [x] Declarar `paths` por check no esquema do `verify.json` e documentar.
- [x] Detectar a mudança dos caminhos cobertos desde o SHA gravado (commitada e não commitada).
- [x] Expor executado versus assinado em `status`, `report`, `handoff`, `prime` e `doctor`.
- [x] Decidir e implementar a regra de legado; registrar a escolha na proposta.
- [x] Decidir e implementar o comportamento sob `--strict`; registrar a escolha na proposta.
- [x] Testes: sign-off fresco, vencido, legado sem SHA, sem `paths`, e fora de repositório.
- [x] Escrever o corpo EARS do delta `specs/gates/delta.md` e documentar em `docs/en/` e `docs/pt/`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0039-signoff-manual-tem-validade/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
