# Tasks — Change 0064-o-next-le-os-mesmos-sinais

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0064-o-next-le-os-mesmos-sinais`. -->

- [ ] Acrescentar ao `computeActions` as ações que faltam: cobertura, evidência dangling, verify não declarado, spec `active` ainda `planned`.
- [ ] Trocar as duas saídas do estado vazio pelas portas que o `AGENTS.md` manda usar.
- [ ] Conferir que cada ação nova nomeia um remédio que a resolve, como a regra C2 exige.
- [ ] Teste: uma árvore em que o `doctor` avisa e o `next` tem de concordar, derivada da mesma coleção.
- [ ] Escrever o corpo EARS do delta `specs/cli`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0064-o-next-le-os-mesmos-sinais/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
