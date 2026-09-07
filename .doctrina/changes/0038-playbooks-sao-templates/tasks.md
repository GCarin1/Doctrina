# Tasks — Change 0038-playbooks-sao-templates

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0038-playbooks-sao-templates`. -->

- [ ] Extrair os quatro playbooks para `templates/playbooks/*.md.template`, sem alterar o texto.
- [ ] Estender a substituição de tokens para o que os playbooks precisam (id, capacidade, ranking, avisos).
- [ ] Fazer `work.js` e `intake.js` renderizarem o template resolvido pela cadeia projeto→bundled.
- [ ] Estender `templates check` para verificar presença e forma dos playbooks.
- [ ] Teste de fidelidade: saída idêntica à atual, e override de projeto funcionando.
- [ ] Fazer `AGENTS.md` e `docs/*/workflow.md` apontarem para o playbook em vez de repeti-lo.
- [ ] Escrever o corpo EARS do delta `specs/templates/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0038-playbooks-sao-templates/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
