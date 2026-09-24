# Change 0178-templates-check-e-update-fundidos-no-upgrade — templates check e update fundidos no upgrade

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** templates


## Why

O `upgrade` já rodava o `templates update` como primeiro passo, e o `templates check` é esse mesmo passo sem poder corrigir: três portas para uma pergunta. A fusão tinha um buraco que a tornava desonesta: o `check` também reporta o que nenhum comando repara (um ponteiro de adapter que perdeu o `AGENTS.md`, um playbook quebrado, um `$schema_version` desconhecido), e o `upgrade` não imprimia nenhum deles. Reproduzido: com o `.cursor/rules/00-doctrina.mdc` apontando para outro arquivo, o `templates check` falhava e o `upgrade` dizia "nothing to upgrade" com exit 0.

## What

- `packages/doctrina-cli/src/commands/upgrade.js`: o passo 1 ("scaffold shape") lista, depois do plano do update, cada achado que só se resolve à mão, com seu remédio; preview e `--write` saem com 1 enquanto sobrar algum.
- `lib/templates-model.js`: os remédios nomeiam `doctrina upgrade --write`; o `doctor` (linha templates) e o mapa de gates nomeiam `doctrina upgrade`.
- `DEPRECATED` ganha `templates check` → `doctrina upgrade` e `templates update` → `doctrina upgrade --write`, desde 0.17.0.
- O comentário que o update escreve num stub passa a ser `<!-- added by doctrina upgrade — fill in -->`.
- `scripts/e2e-packed.mjs` usa o `upgrade`; bloco de comandos regenerado; docs EN/PT (referência, ci, workflow, flow, upgrading, deferred) e README do pacote.

## Scope boundaries

- `templates list` fica: diz de onde cada template resolve (projeto ou pacote), o que o `upgrade` não faz.
- Nada é removido: os dois nomes continuam funcionando com aviso. Os requisitos da spec `templates` que os citam continuam verdadeiros até a change que os remover, que os reescreve.

## Verification

- [x] `packages/doctrina-cli/test/o-upgrade-cobre-o-templates.test.js` passa (3 testes) e falha 3/3 no código anterior.
- [x] `node scripts/e2e-packed.mjs` verde contra o pacote instalado (45 checks), já usando o `upgrade`.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
