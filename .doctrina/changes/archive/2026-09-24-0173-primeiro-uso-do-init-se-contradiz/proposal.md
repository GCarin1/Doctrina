# Change 0173-primeiro-uso-do-init-se-contradiz — primeiro uso do init se contradiz

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** scaffolding


## Why

Rodei o primeiro uso do zero e recebi três orientações diferentes:

- o `init` terminava com "edit AGENTS.md and .doctrina/product.md for your project";
- o `next`, logo em seguida, pedia `doctrina intake --text "<what this project is>"`;
- o `AGENTS.md` diz que o agente roda os comandos e o humano fica passivo.

Num terminal, o `init` perguntava uma "descrição de uma frase", gravava só no `product.md` e não criava o intake. A mesma resposta era então pedida de novo pelo `next`.

## What

- `packages/doctrina-cli/src/commands/init.js`: num terminal, sem descrição nem intake, uma pergunta só ("describe the project — what it is, who it is for, what it must do"); a resposta vira o intake e a descrição sai dela. Fecha com a instrução única de `nextStepAfterInit("tty")`.
- `lib/intake-model.js`: `nextStepAfterInit`, a mensagem de fechamento; sem intake ela nomeia `doctrina intake --text` e `doctrina work --from-diff`, os mesmos passos do `next`.
- Com intake passado por flag (`--intake`, `--intake-text`), nada muda: o playbook do agente continua sendo impresso.
- Docs EN/PT: tabela e parágrafo do `init` na referência; o guia de início deixa de mandar editar o `product.md` à mão.

## Scope boundaries

- `--project-description` continua sendo só a descrição do `product.md`, sem intake: scripts que já o usam não mudam de comportamento, só de mensagem final.
- A pergunta do adapter no terminal continua como era.

## Verification

- [x] `packages/doctrina-cli/test/o-primeiro-uso-tem-uma-instrucao.test.js` passa (3 testes); com o `init.js` anterior o teste de ponta a ponta falha.
- [x] Caminho interativo exercitado por pseudo-terminal (`script`): a resposta vira `.doctrina/intake.md` com `Source: typed at doctrina init`, a linha final manda ao agente, e o `next` diz "a pending intake awaits conversion".
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
