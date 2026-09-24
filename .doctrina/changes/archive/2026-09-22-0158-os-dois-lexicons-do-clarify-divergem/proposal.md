# Change 0158-os-dois-lexicons-do-clarify-divergem — os dois lexicons do clarify divergem

- **Status:** applied
- **Applied:** 2026-09-22
- **Date:** 2026-09-22
- **Owner:**
- **Lane:** product
- **Affects specs:** gates gates

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

Os dois lexicons do `clarify` não cobrem as mesmas categorias: o português sinaliza adjetivos de qualidade que não nomeiam limite algum — `robusto`, `escalavel`, `adequado` — e o inglês não tem equivalente nenhum. A mesma frase traduzida dá três smells de um lado e zero do outro, então um projeto que mantém as duas línguas em paridade recebe veredito contraditório sobre o mesmo conteúdo.

## What

O lexicon inglês de `clarify` ganha os adjetivos que o português já
sinalizava. Eles entram na mesma regra dos quantificadores e pelo mesmo
motivo: um adjetivo que não nomeia limite não pode ser cumprido nem
descumprido.

Um teste passa a cobrar que as duas listas declarem as mesmas CATEGORIAS —
e prova, na frase que expôs o defeito, que as duas línguas respondem igual.

Artefatos: `packages/doctrina-cli/src/commands/clarify.js`,
`packages/doctrina-cli/test/um-smell-test-nao-muda-de-lingua.test.js` (novo).

## Scope boundaries

As divergências deliberadas ficam: `TODO` sozinho é marcador em inglês e
pronome comum em português, e `may` é gramática de EARS Optional. As duas
carregam a razão num comentário ao lado. O que o teste prende é a cobertura
de categoria, não os membros.

Nenhuma palavra nova entra nas duas listas ao mesmo tempo: isso seria outra
decisão. Aqui o inglês apenas alcança o português.

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
- [x] A mesma frase, nas duas línguas, dá o mesmo número de smells, e as duas
      listas declaram as mesmas categorias — provado em
      `packages/doctrina-cli/test/um-smell-test-nao-muda-de-lingua.test.js`.

## Open questions

Nenhuma.
