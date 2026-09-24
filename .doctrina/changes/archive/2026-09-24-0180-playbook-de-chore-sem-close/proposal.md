# Change 0180-playbook-de-chore-sem-close — playbook de chore sem close

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring

- **Documented surface:** n/a — só o texto do playbook e a linha de abertura da chore; nenhum comando ou flag muda

## Why

O `AGENTS.md` diz que "`doctrina close <id>` é a definição de pronto", e o playbook de trabalho termina nele. O playbook de chore terminava com `change apply`, `change archive` e `validate` feitos à mão, e a linha "Chore opened", que o `work --chore` imprime ao abrir, dizia o mesmo. Esse caminho nunca roda o review do close, o gate de documentação e CHANGELOG, coverage, trace e o checkpoint de ADR.

Nesta sessão fechei as chores 0167 e 0171 com `close` sem nenhum ajuste, e reproduzi o mesmo num projeto novo: uma chore feita pelo playbook fecha em uma passada.

## What

- `.doctrina/templates/playbooks/chore.md.template`: os passos 4 e 5 (apply, archive, validate) viram um passo 4 com `doctrina close`, a lembrança de docs e CHANGELOG e a declaração `Documented surface`; "archive/analyze recusam" vira "o close recusa".
- `packages/doctrina-cli/src/lib/change-ops.js`: a linha "Chore opened" nomeia `doctrina close <id>`.
- Golden `test/fixtures/playbooks/chore.txt` recapturado, com o motivo registrado no cabeçalho de `playbooks.test.js`.

## Scope boundaries

- `change apply` e `change archive` continuam existindo: são as primitivas que o `close` executa e servem a quem conduz à mão.

## Verification

- [x] `packages/doctrina-cli/test/a-chore-fecha-como-toda-change.test.js` passa (2 testes); com o playbook anterior, o teste do texto falha.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
