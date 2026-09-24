# Change 0152-insight-descreve-saidas-que-o-cli-nao-tem — insight descreve saidas que o cli nao tem

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** insight
- **Documented surface:** n/a — nomeia dois comandos para dizer o que a spec dizia errado sobre eles; nenhum comando, flag ou código de saída muda insight

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

A spec insight carrega dois requisitos que o CLI nao cumpre e que a spec cli contradiz: search deveria sair 1 sem correspondencia e sai 0, e show deveria sair 1 numa referencia que nao resolve e sai 2. O texto veio junto quando insight foi separada de gates e ninguem releu.

## What

Os dois requisitos da spec `insight` passam a descrever o comando que
existe: `search` que não recusa quando não acha, e `show` que responde uma
referência irresolvível com a classe de invocação. Os dois citam a regra
de onde ela vem, em vez de repetir um número.

Um teste novo mede as duas classes pelo comando de verdade e lê as duas
frases de volta, para que a spec não volte a se afastar em silêncio.

Artefatos: `packages/doctrina-cli/test/a-spec-descreve-o-cli-que-existe.test.js`
(novo), delta na spec `insight`. Nenhum código de produção muda — o CLI já
estava certo; era a spec que descrevia outro.

## Scope boundaries

Nenhum comportamento do CLI muda. E nenhum gate novo tenta julgar se um
requisito é verdadeiro em geral — isso é semântica, e a ADR 0005 a mantém
fora dos gates determinísticos. O que é medido aqui são estas duas frases,
que falam de algo que uma máquina consegue observar: a classe de saída.

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
- [x] As classes que os dois comandos realmente devolvem são medidas, e as
      frases antigas não estão mais na spec, provado em
      `packages/doctrina-cli/test/a-spec-descreve-o-cli-que-existe.test.js`.

## Open questions

Nenhuma.
