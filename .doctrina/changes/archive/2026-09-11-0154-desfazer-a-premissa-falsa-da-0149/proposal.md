# Change 0154-desfazer-a-premissa-falsa-da-0149 — desfazer a premissa falsa da 0149

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: change, declarar)
- **Affects specs:** templates templates

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

A change 0149 partiu de uma premissa falsa: packages/doctrina-cli/templates nao e uma segunda copia mantida a mao, e uma arvore gerada no prepack a partir de .doctrina/templates e ignorada pelo git. A orientacao sempre chegou a quem adota. O teste que ela deixou le um diretorio que um checkout limpo nao tem, entao quebra o CI, e a spec passou a declarar como fonte um diretorio gerado.

## What

O cabeçalho `Source:` da spec `templates` volta a nomear só a árvore
autorada: um diretório gerado e fora do controle de versão não tem dono a
declarar (ADR 0027 fala de código escrito).

O requisito que a 0149 acrescentou é trocado pelo invariante verdadeiro, o
que ninguém tinha escrito e que é justamente o que faltava para a leitura
errada não acontecer: a árvore do pacote é GERADA da árvore canônica no
`prepack`, e a canônica é a única cópia autorada.

O teste é reescrito para cobrar a cadeia de empacotamento, que é o que
realmente pode quebrar em silêncio — tirar o hook, ou tirar `templates` de
`files`, publica um pacote sem template nenhum e o `init` de quem adota
falha com todos os gates daqui verdes.

Artefatos: `packages/doctrina-cli/test/o-template-que-envia-e-o-que-vale.test.js`,
delta na spec `templates`.

## Scope boundaries

A change 0149 não é desarquivada nem reescrita: o histórico registra o que
foi feito, inclusive quando foi feito por um motivo errado. Esta change
desfaz o efeito e diz por quê.

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
- [x] Nenhum teste lê `packages/doctrina-cli/templates/`, que um checkout
      limpo não tem — era isso que quebraria o CI.
- [x] A cadeia de empacotamento é provada em
      `packages/doctrina-cli/test/o-template-que-envia-e-o-que-vale.test.js`.

## Open questions

Nenhuma.
