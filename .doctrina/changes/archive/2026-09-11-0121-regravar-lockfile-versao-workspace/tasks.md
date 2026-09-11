# Tasks — Change 0121-regravar-lockfile-versao-workspace

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Confirmar a divergência entre o stamp do lockfile e o `package.json` do pacote.
- [x] Regravar `package-lock.json` com `npm install`.
- [x] Provar que `npm install` agora deixa a árvore limpa e que `npm ci` segue instalando.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-11-0121-regravar-lockfile-versao-workspace/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
