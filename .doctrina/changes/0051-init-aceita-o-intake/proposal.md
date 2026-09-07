# Change 0051-init-aceita-o-intake — init aceita o intake

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** scaffolding

## Why

init e intake sao dois comandos para um unico momento de onboarding e ninguem roda o primeiro sem rodar o segundo, expondo uma justificativa arquitetural como duas etapas de UX; aceitar o intake dentro do init

## What

`doctrina init` passa a aceitar o intake no mesmo comando: `init --intake <arquivo>` ou
`init --intake-text "<texto>"` scaffolda a árvore, grava a descrição verbatim e imprime
o playbook de bootstrap numa passada só.

- Os dois comandos continuam existindo para quem precisa deles separados.
- Nenhuma interpretação de linguagem entra no CLI: a ADR 0005 fica intacta.
- Delta em `specs/scaffolding`.

Achado F20 da auditoria. Ninguém roda `init` sem depois rodar `intake`. A separação
existe porque `init` se recusa a interpretar linguagem — o que é correto, mas é uma
justificativa arquitetural exposta ao usuário como duas etapas de onboarding.

## Scope boundaries

- Não funde os comandos: `intake` segue sendo a porta para converter uma descrição num projeto já existente.
- Não muda o playbook de bootstrap.
- Não adiciona nenhuma leitura semântica da descrição.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] `init --intake <arquivo>` produz exatamente o mesmo estado que `init` seguido de `intake <arquivo>`.
- [ ] Um valor ausente na flag é erro de uso, não fallback silencioso.
- [ ] O guia de primeiros passos passa a mostrar um comando onde mostrava dois.

## Open questions

- Nenhuma.
