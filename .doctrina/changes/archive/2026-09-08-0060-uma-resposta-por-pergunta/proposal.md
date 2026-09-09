# Change 0060-uma-resposta-por-pergunta — uma resposta por pergunta

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** runtime (confident; signals: runner) — opened anyway (--force)
- **Affects specs:** gates

## Why

um passo declarado sem runner tem duas respostas: o doctor reporta nao checado e o close spawna o proprio binario por um caminho que nenhum passo alcanca; e nada percebe export de lib que ninguem consome

## What

Duas arrumações estruturais que a auditoria encontrou juntas.

- **A9.** A change 0045 tirou do `doctor` o hábito de rodar o próprio binário por
  subprocesso — "dois estilos de integração dentro de um comando só". O `close`
  mantém `spawnStep` como fallback para um passo declarado sem runner em
  processo; só que todo passo tem runner e um teste garante que continue assim.
  A mesma pergunta tem duas respostas, e uma delas é inalcançável.
- **A10.** Oito exports de `lib/` não são referenciados por nada — nem pelo
  próprio arquivo, nem pelos testes — e dois nasceram nas changes 0046 e 0050.
  Cada extração deixa um pouco de superfície pública sem consumidor e nada
  percebe.

Escolher uma resposta para o passo sem runner e aplicá-la nos dois drivers; e um
teste de drift para exports sem consumidor, no formato que o projeto já usa para
flags e comandos — o teste é o que impede a reincidência, a limpeza é
consequência. Delta em `specs/gates`.

## Scope boundaries

- Não muda a sequência de gates nem o que cada passo faz.
- Não remove export que exista como costura de teste: o teste distingue "sem
  consumidor" de "consumido só por teste".

## Verification


- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um passo declarado sem runner tem o mesmo comportamento no `close` e no `doctor`.
- [x] Nenhum export de `lib/` fica sem consumidor, e um novo é pego pelo teste.

## Open questions

- Nenhuma.
