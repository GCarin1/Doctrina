# Tasks — Change 0162-o-status-do-intake-nao-tem-dono-nem-gate

- [x] Declarar os dois valores do status do intake e lê-lo pelo mesmo
      caminho que todo outro status do repositório.
- [x] Fazer o `validate` recusar qualquer outro valor, com a severidade que
      um `Status` inválido já tem numa spec.
- [x] Dar ao CLI o comando que escreve esse cabeçalho, e apontar o passo 7
      do playbook para ele em vez de mandar editar à mão.
- [x] Documentar a flag em EN e PT, e corrigir a classe de saída que a
      referência descrevia errado.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-23-0162-o-status-do-intake-nao-tem-dono-nem-gate/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
