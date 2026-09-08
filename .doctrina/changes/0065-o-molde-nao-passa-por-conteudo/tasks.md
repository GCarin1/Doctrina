# Tasks — Change 0065-o-molde-nao-passa-por-conteudo

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0065-o-molde-nao-passa-por-conteudo`. -->

- [ ] Generalizar a régua da change 0057 para corpo de seção e corpo de critério, no document model.
- [ ] Aplicar no `decision accept`: recusar um ADR cujo Context/Decision/Consequences ainda é o molde, nomeando o que falta.
- [ ] Aplicar no `validate`: um critério de aceitação ainda placeholder é reportado, com o mesmo escape deliberado que os headers têm.
- [ ] Testes: ADR de molde recusado, ADR com uma linha aceito, spec recém-criada reportada, e o caso já coberto do proposal no `analyze`.
- [ ] Escrever os corpos EARS dos deltas `specs/validation` e `specs/authoring`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0065-o-molde-nao-passa-por-conteudo/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
