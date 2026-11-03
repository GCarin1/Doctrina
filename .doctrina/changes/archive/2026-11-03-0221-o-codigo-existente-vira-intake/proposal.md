# Change 0221-o-codigo-existente-vira-intake — o codigo existente vira intake

- **Status:** applied
- **Applied:** 2026-11-03
- **Date:** 2026-11-03
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** authoring, gates

- **Documented surface:** `doctrina intake --from-code` — documented in `docs/en/cli-reference.md` and `docs/pt/cli-reference.md`; the hubs' bootstrap line and `next` point at it


## Why

Um repositório que já tem código e nenhuma spec não tem descrição para entregar ao bootstrap: a verdade dele é o código. O AGENTS.md mandava usar `work --from-diff`, que faz backfill de UMA change a partir do diff — não absorve um projeto inteiro. No workspace, todo repositório sombra nasce assim, sem specs.

Ao fechar a change 0220, o processo morreu enquanto o `verify` rodava, com a change já aplicada; o `close` seguinte recusou para sempre, porque a pergunta de pré-aplicação lê a spec que o próprio apply escreveu como conflito.

## What

- `doctrina intake --from-code` (`src/commands/intake.js`) guarda o inventário do código como intake (`src/lib/code-inventory.js`): stack e frameworks dos manifestos, testes, CI e runtime, áreas candidatas, comandos de build e teste, e só os NOMES das variáveis dos arquivos `.env` de exemplo.
- Novo playbook `absorb` (`.doctrina/templates/playbooks/absorb.md.template`): descrever o que o código faz hoje, perguntas abertas para o que ele não diz, baseline pequeno, critérios citando testes que já existem; com token `WORKSPACE_STEP`.
- O AGENTS.md (e o template) e a ação de bootstrap do `next` apontam para `intake --from-code`.
- O `close` retoma uma change já aplicada (perguntas de integridade) e o `change apply` pula a change aplicada antes do gate de pré-aplicação.

## Scope boundaries

- O inventário não interpreta prosa nem lê valores de configuração.
- `work --from-diff` continua existindo para o backfill de uma change.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
