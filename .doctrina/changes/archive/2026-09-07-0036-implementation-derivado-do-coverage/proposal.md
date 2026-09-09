# Change 0036-implementation-derivado-do-coverage — Implementation derivado do coverage

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

o cabecalho Implementation e mantido a mao enquanto coverage ja computa quantos criterios tem prova que resolve; derivar o valor da aritmetica do coverage e propor o op set-header no delta em vez de pedir ao agente que lembre

## What

O cabeçalho `**Implementation:**` passa a ter uma resposta derivada, em vez de ser
mantido de cabeça. `src/commands/coverage.js` já computa, por spec, quantos critérios
têm prova que resolve — que é a definição de `verified`.

- Regra: 100% coberto sem dangling nem conditional → `verified`; ao menos um coberto → `partial`; nenhum → `planned`.
- `validate` avisa quando o cabeçalho contradiz o coverage (hoje só avisa em `active` + `planned`).
- `close` propõe o op `set-header Implementation: ...` para o delta, em vez de pedir ao agente que lembre.
- `spec set <cap> --implementation auto` aplica o valor derivado.
- Delta em `specs/gates`.

Achado F10 da auditoria. O playbook do `work` pede duas vezes (passos 5 e 7) que o
agente avance um campo cujo valor correto já está calculado no arquivo ao lado.

## Scope boundaries

- Nunca reescreve o cabeçalho sozinho: propõe o op, e o humano ou o agente aplica.
- A nota de escape existente (`planned — backend adiado, ver ADR 0007`) continua silenciando o aviso.
- Não muda o eixo `Status:`, que é do documento e não da capacidade.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma spec com 100% de coverage e `Implementation: planned` gera aviso no `validate`.
- [x] `close` imprime o op `set-header` correspondente entre as suas etapas consultivas.
- [x] `spec set --implementation auto` produz o mesmo valor que a regra declara.
- [x] Uma spec com nota de escape não gera aviso.

## Open questions

- Resolvida: basta que a prova RESOLVA no disco. Exigir execução colocaria uma
  suíte de testes dentro do `validate`, que é a leitura estrutural barata; o
  `coverage --run` continua sendo o opt-in que executa a prova. E o caso que
  motivava a dúvida já está coberto: um critério cuja única prova é uma suíte
  pulada é `conditional`, então nunca conta como coberto.
