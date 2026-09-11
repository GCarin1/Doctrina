# Change 0150-sequencia-de-close-repetida-de-copia-velha — sequencia de close repetida de copia velha

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** gates, docs

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

Os arquivos de comando dos adaptadores claude e cursor e as paginas flow.md em EN e PT repetem a sequencia de fechamento a partir de uma copia, e as copias estao velhas: os adaptadores nomeiam quatro passos de treze e as docs onze, sem review, implementation e index-drift. A change 0145 ja corrigiu esse mesmo defeito nos playbooks.

## What

`lib/gates.js` ganha `sequenceLabels(name)`: a sequência declarada, rótulo
a rótulo, com a marca de advisory e de forceable derivada do `level` — os
próprios rótulos já discordavam entre si, `trace` é advisory e não dizia.

O texto de ajuda do close passa a renderizar dessa função em vez de trazer
a lista digitada; os dois arquivos de comando dos adaptadores apontam para
`doctrina close --help` em vez de repetir; e as páginas `flow.md` e
`cli-reference.md`, em EN e PT, passam a nomear a sequência inteira.

Um teste novo cobra as duas coisas: que a ajuda renderize a declaração na
ordem em que ela roda, e que qualquer cadeia escrita em prosa que fale do
close nomeie todos os passos. Foi ele que achou as duas cópias de
`cli-reference.md`, que eu não tinha visto.

Artefatos: `packages/doctrina-cli/src/lib/gates.js`,
`packages/doctrina-cli/src/commands/close.js`, os templates de adaptador
claude e cursor e os arquivos instalados, `docs/{en,pt}/flow.md`,
`docs/{en,pt}/cli-reference.md`,
`packages/doctrina-cli/test/a-sequencia-tem-um-autor-so.test.js` (novo).

## Scope boundaries

As cadeias que descrevem o PLAYBOOK — context → spec delta → tasks →
implementar → analyze → apply — ficam como estão: são outra lista, e estão
certas. O teste distingue uma da outra e tem um caso provando isso.

A ADR 0012 e o CHANGELOG também repetem a sequência antiga e não são
tocados: são registro histórico, e dizem o que era verdade quando foram
escritos.

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
- [x] `doctrina close --help` imprime os treze passos declarados, na ordem,
      provado em `packages/doctrina-cli/test/a-sequencia-tem-um-autor-so.test.js`.
- [x] Nenhuma prosa governada descreve um close abreviado, provado no
      mesmo arquivo — que também prova saber reprovar um.

## Open questions

Nenhuma.
