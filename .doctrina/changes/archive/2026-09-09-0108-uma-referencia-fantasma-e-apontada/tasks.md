# Tasks — Change 0108-uma-referencia-fantasma-e-apontada

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `validate`: `Depends on` para uma capability sem spec é `error`, com o remédio.
- [x] `validate`: `Affects specs` para uma capability sem spec e sem delta ADDED na change é `warning`.
- [x] `validate`: uma âncora declarada duas vezes em `product.md` é `error`; o `trace` nomeia a duplicata em vez de deduplicar em silêncio.
- [x] Teste: os três casos, e o caso legítimo (delta ADDED) que não avisa.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (lista do `validate`).
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0108-uma-referencia-fantasma-e-apontada/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
