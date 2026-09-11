# Change 0148-handoff-com-cabecalho-colado — handoff com cabecalho colado

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product
- **Affects specs:** insight

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

O documento do handoff emite um cabeçalho Markdown malformado: no ramo sem mudanças abertas a linha '- none — the tree is at rest' não é seguida de linha em branco, e o '## Next actions' vem colado nela. Como o handoff existe para ser colado noutra sessão, o cabeçalho não renderiza.

## What

O ramo sem trabalho aberto de `handoff()` em
`packages/doctrina-cli/src/lib/views.js` fecha com a linha em branco que
o outro ramo já emitia, e um teste passa a checar a forma do documento
inteiro em vez de uma linha: todo cabeçalho ATX das vistas Markdown —
handoff e report, com e sem change aberta — vem depois de uma linha em
branco ou do começo do arquivo.

Artefatos: `packages/doctrina-cli/src/lib/views.js`,
`packages/doctrina-cli/test/o-handoff-e-markdown-valido.test.js` (novo),
delta na spec `insight`.

## Scope boundaries

As vistas de terminal — `prime`, `status`, `dashboard` — ficam de fora: o
destino delas é a tela, não um arquivo Markdown colado noutro lugar, e
elas usam cor e indentação que um checador de forma leria como erro.

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
- [x] Nenhum cabeçalho das vistas Markdown fica colado na linha anterior,
      nos dois estados da árvore, provado em
      `packages/doctrina-cli/test/o-handoff-e-markdown-valido.test.js`.

## Open questions

Nenhuma.
