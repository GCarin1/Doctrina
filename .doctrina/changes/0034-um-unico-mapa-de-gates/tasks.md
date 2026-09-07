# Tasks — Change 0034-um-unico-mapa-de-gates

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0034-um-unico-mapa-de-gates`. -->

- [ ] Modelar `SEQUENCES` em `lib/gates.js`: passo, gate, nível, comando de reexecução.
- [ ] Reescrever `close.js` como laço sobre a sequência declarada, preservando a saída atual.
- [ ] Reescrever as linhas de `doctor.js` como laço sobre a sua sequência.
- [ ] Implementar `doctrina ci --emit github` gerando o `action.yml`.
- [ ] Teste de drift: as três sequências e o YAML versionado concordam com a declaração.
- [ ] Atualizar `docs/en/gating.md` e `docs/pt/gating.md`.
- [ ] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0034-um-unico-mapa-de-gates/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
