# Change 0137-declarar-qual-capacidade-possui — declarar qual capacidade possui os arquivos de raiz que hoje nao pertencem a nenhuma

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (confident; signals: declarar)
- **Affects specs:** docs, gates, cli

## Why

`doctrina review` mapeia um arquivo alterado para a capacidade que o
declara, e o ADR 0027 diz que essa posse é **declarada, nunca inferida**.
Cinco arquivos governados na raiz não eram declarados por ninguém:

    SECURITY.md  CONTRIBUTING.md  CONVENTIONS.md  action.yml  tsconfig.json

O efeito apareceu nesta mesma sessão. O `SECURITY.md` foi reescrito pela
change 0124 por conter uma afirmação falsa sobre o que o CLI executa, e o
`review` não teve como dizer qual spec deveria acompanhar aquela edição —
ele apenas listou o arquivo como pertencente a nenhuma capacidade, ao lado
de um lockfile.

Um arquivo sem dono é um arquivo que nenhum gate consegue defender. É o
caso em que a política de segurança de um projeto muda e o gate estrutural
não sabe o que perguntar.

## What

Cada um ganha o dono que já o governava de fato.

`SECURITY.md`, `CONTRIBUTING.md` e `CONVENTIONS.md` vão para `docs`, que
já reivindica os READMEs e o CHANGELOG — são documentos em prosa na raiz,
do mesmo tipo.

`action.yml` vai para `gates`. Ele é gerado por `doctrina ci --emit
github` a partir da mesma declaração que `close` e `doctor` leem, e um
critério daquela spec já o fixa byte a byte; faltava só a posse.

`tsconfig.json` vai para `cli`, que já declara o arranjo do typecheck em
dois requisitos e dois critérios: checkJs, sem emissão.

Antes de aplicar, os três cabeçalhos foram comparados entrada a entrada
com os originais, para garantir que reescrevê-los não des-reivindicasse
nada em silêncio. Nenhuma entrada foi perdida.

## Scope boundaries

`package.json`, `package-lock.json` e os arquivos de workspace seguem sem
dono, e de propósito: são metadados de empacotamento, não superfície de
capacidade, e criar uma capacidade para eles trocaria uma nota de review
por uma spec que ninguém leria. O ADR 0027 torna a não-declaração uma
escolha legítima; o defeito era ela não ter sido feita.

Não altera o conteúdo de nenhum dos cinco arquivos.

## Nota sobre o fechamento forçado

O gate de documentação acusou superfície alterada — `action.yml`,
`coverage`, `trace`, `verify`, `--emit` — e foi fechado com `--force`.

Nenhuma superfície mudou. Todos esses nomes vêm da **prosa dos deltas**,
que explica por que cada arquivo vai para a capacidade que vai; o
`action.yml`, por exemplo, é citado para dizer quem o gera. Os cabeçalhos
`**Source:**` são a única coisa que muda de fato, e eles não são
superfície documentada.

É a segunda vez nesta sessão — a change 0131 foi fechada pelo mesmo
motivo. Um gate que acusa o que não aconteceu é forçado, e um gate que se
força com frequência deixa de ser gate. A correção do extrator de sinais
é trabalho próprio, aberto em seguida.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Nenhum `**Source:**` perdeu entrada na reescrita, conferido entrada a entrada.
- [x] `validate` não reporta padrão morto em nenhum dos três cabeçalhos.

## Open questions

Nenhuma.
