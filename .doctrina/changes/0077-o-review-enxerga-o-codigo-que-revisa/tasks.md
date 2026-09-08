# Tasks — Change 0077-o-review-enxerga-o-codigo-que-revisa

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Medir a cobertura atual do mapeamento arquivo → capability e registrar o número.
- [ ] Dar às capabilities uma forma declarada de dizer que código lhes pertence, sem o review adivinhar.
- [ ] Fazer o aviso de código sem capability disparar por arquivo, não só quando o diff inteiro não casa.
- [ ] Teste: um arquivo do CLI mapeia para a spec que o descreve, e a cobertura medida não regride.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0077-o-review-enxerga-o-codigo-que-revisa/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
