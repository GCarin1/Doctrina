# Tasks — Change 0086-o-envelope-json-nao-mente

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir a tabela: para cada gate falhando, o exit do processo e o que o payload afirma.
- [ ] Fazer o envelope ser emitido a partir do código de saída real, não de um default otimista.
- [ ] Conferir os dez call sites, incluindo o `validate` que hoje acerta por sobrescrita do spread.
- [ ] Teste: cada gate nativo falhando tem payload.ok falso e payload.exit_code igual ao do processo.
- [ ] Escrever o corpo EARS do delta `specs/cli`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0086-o-envelope-json-nao-mente/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
