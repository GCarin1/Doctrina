# Change 0098-o-bom-nao-apaga-o-titulo-da-spec — o BOM nao apaga o titulo da spec

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** validation

## Why

um arquivo salvo com byte order mark faz o validate declarar que a spec nao tem titulo enquanto show, spec list e coverage leem o mesmo arquivo sem problema, entao a leitura do documento precisa remover o BOM uma vez no modelo de documento
## What

`fs-ops.read()` remove a marca de ordem de bytes uma vez, à porta. Todo
módulo lê por ali, então nenhum parser a jusante precisa de saber que ela
existe.

Terceira auditoria, achado 5. Uma spec gravada por editor Windows abre com
`﻿# Spec — …`: o `validate` dizia «carries no title» enquanto `show`,
`spec list` e `coverage` liam o mesmo arquivo sem queixa. O formato do
defeito era a discordância — e o único que recusava nomeava uma causa que
não era a causa.

Vai além do Markdown: `JSON.parse` rebenta com uma marca à cabeça, então um
`index.json` gravado pelo editor errado falhava com um erro que não nomeava
nem a causa nem o arquivo. Isso também deixou de acontecer.

## Scope boundaries

- Só a marca INICIAL. Uma no meio do arquivo é conteúdo, por estranho que seja, e fica.
- Não converte codificações: um arquivo que não seja UTF-8 continua a ser lido como UTF-8, e isso é outro problema.
- Um arquivo que tinha marca perde-a quando um comando o reescreve. É normalização deliberada — nada nesta árvore ganha em mantê-la.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma spec com marca mantém o título para o `validate`, e as outras superfícies não mudam.
- [x] Um `index.json` com marca continua legível.
- [x] Marcar a árvore inteira não faz nenhum gate mudar de ideia.
- [x] Uma marca no meio do arquivo é preservada.

## Open questions

- Nenhuma.
