# ADR 0029 — O contexto de vários repositórios mora num workspace privado, ligado por link e oculto do git do repositório

- **Status:** accepted
- **Date:** 2026-11-03
- **Deciders:** project owner
- **Scope:** workspace
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/workspace.js`, `packages/doctrina-cli/src/commands/workspace.js`
- **Landed:** —

## Context

O Doctrina nasceu para um repositório: o `.doctrina/` fica ao lado do
código, e todo comando lê a partir do diretório atual (são 56 usos de
`process.cwd()` no CLI). Uma entrega real de uma equipe de QA ou de
produto atravessa vários repositórios — `front-core`, `front-feature`,
`back-end`, o app — e um orquestrador precisa saber quais existem, o que
cada um é e como dependem um do outro.

Além disso, nem todo repositório pode carregar `.doctrina/`. Em vários
repositórios da empresa o time não autoriza a pasta, ou o operador não tem
permissão de commit nela. Sem um lugar para o contexto desses projetos, o
agente reabsorve o código a cada sessão e nada fica versionado.

Três caminhos foram medidos:

| Caminho | Custo | Problema |
|---|---|---|
| Um `--root`/`DOCTRINA_ROOT` em todos os comandos | trocar 56 pontos e todo teste que parte do cwd | regressão em toda a superfície por uma necessidade nova |
| Copiar os artefatos para dentro do repositório e de volta | baixo | duas cópias divergem; a primeira edição pela metade perde trabalho |
| Ligar o `.doctrina/` sombra dentro do repositório e escondê-lo do git dele | uma função de link e o arquivo `.git/info/exclude` | links de arquivo no Windows pedem privilégio |

## Decision

1. Um **workspace** é um diretório com `workspace.json` (projetos, papéis,
   dependências, ferramentas, modelos), `projects/` e `deliveries/`. O
   `doctrina workspace init` o cria como um repositório git, que o
   operador mantém PRIVADO: é ele que versiona o contexto dos projetos que
   não podem versioná-lo.
2. Um projeto é `in-repo` (o `.doctrina/` é do próprio repositório) ou
   `shadow` (os artefatos ficam em `projects/<nome>/` do workspace).
3. Um projeto sombra é **ligado** ao repositório: o `.doctrina/` vira um
   link de diretório (junção no Windows, que não pede privilégio); o
   AGENTS.md e os arquivos do adaptador viram links de arquivo, com link
   físico e, por último, cópia como alternativas — e a cópia é anunciada.
   Um caminho que o repositório já tem é um conflito e fica intocado.
4. Os links são escondidos do git do repositório por um bloco marcado em
   `.git/info/exclude`, que o git lê e nunca versiona. Nada é commitado no
   repositório sombreado, e `detach` desfaz exatamente o que `attach` fez.
5. Nenhum comando existente muda: dentro do repositório o `.doctrina/` está
   lá, e `work`, `context`, `close` funcionam como sempre. O workspace é
   encontrado por `$DOCTRINA_WORKSPACE`, pelo diretório (ou um ancestral)
   com `workspace.json`, pelo link sombra ou pelo ponteiro que o `init`
   grava em `$DOCTRINA_HOME`.

## Consequences

- O operador ganha um lugar versionado para o contexto de qualquer
  repositório, autorizado ou não, sem pedir permissão a ninguém.
- O caminho de cada repositório fica no `workspace.json`; numa outra
  máquina, `doctrina workspace attach <nome> --path <clone>` religa.
- Um link removido por engano no repositório some sem perda: o conteúdo
  está no workspace. O inverso também vale — apagar o workspace apaga o
  contexto, por isso ele é um repositório git.
- O CLI continua sem dependências e sem rede: link, `git rev-parse` e
  `git ls-files` são tudo o que o workspace usa.
