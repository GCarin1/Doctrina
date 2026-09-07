# Tasks — Change 0038-playbooks-sao-templates

- [x] Extrair os playbooks para `templates/playbooks/*.md.template`, sem alterar o texto.
- [x] Estender a substituição de tokens para o que os playbooks precisam (id, capacidade, ranking, avisos).
- [x] Fazer `work.js` e `intake-model.js` renderizarem o template resolvido pela cadeia projeto→bundled.
- [x] Estender `templates check` para verificar presença e forma dos playbooks.
- [x] Teste de fidelidade: saída byte-idêntica à anterior (goldens capturados do código pré-migração), e override de projeto funcionando.
- [x] Documentar os tokens e a marcação de cor no README dos templates.
- [x] Fazer `AGENTS.md` e `docs/*/workflow.md` apontarem para o playbook em vez de repeti-lo.
- [x] Escrever o corpo EARS do delta `specs/templates/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0038-playbooks-sao-templates/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
