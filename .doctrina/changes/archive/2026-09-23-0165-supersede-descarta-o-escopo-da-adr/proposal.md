# Change 0165-supersede-descarta-o-escopo-da-adr — supersede descarta o escopo da adr

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring authoring

<!--
Optional, and usually absent. The closing docs gate reads COMMAND and FLAG
names out of the prose below and asks for documentation when it finds any.
It cannot tell a change from a mention: explaining an effect, or writing a
Scope boundaries line about what this deliberately does NOT touch, names
things just as loudly as changing them would.

When that happens, say so on the record instead of forcing the close:

- **Documented surface:** n/a — names two commands to explain an effect; alters neither

`none` reads the same as `n/a`, and a BARE one silences nothing — the
reason is the declaration.
-->

## Why

O decision supersede cria a ADR sucessora a partir do template e so injeta o Supersedes: o Scope da ADR substituida e descartado. Uma decisao restrita a uma capability vira global ao ser refinada, e ao ser aceita passa a carregar em todo pack de contexto, inclusive nos de capabilities que a original nunca governou. Nada avisa.

## What

`decisionSupersede` em `packages/doctrina-cli/src/commands/decision.js` lê o
`Scope:` da ADR substituída com `parseAdrScope` e o escreve na sucessora com
`insertScopeHeader` — os dois helpers já existiam no mesmo módulo. O comando
diz em voz alta quando herdou um escopo, e o header fica no arquivo onde o
autor o amplia se quiser.

Artefatos: `commands/decision.js`, `docs/{en,pt}/cli-reference.md`,
`packages/doctrina-cli/test/uma-adr-substituta-herda-o-escopo.test.js` (novo).

## Scope boundaries

Uma ADR global continua gerando uma sucessora global: nada é inventado, só
carregado. E nenhuma ADR já aceita é reescrita — elas são imutáveis; o
defeito está na sucessora que o comando GERA.

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
- [x] A sucessora herda o escopo e, aceita, fica fora dos packs de que a
      original ficava fora — provado pelo `context` em
      `packages/doctrina-cli/test/uma-adr-substituta-herda-o-escopo.test.js`,
      que reprova o código anterior.

## Open questions

Nenhuma.
