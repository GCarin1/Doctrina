# Change 0164-gatilho-de-skill-so-enxerga-vagueza-em-ingles — gatilho de skill so enxerga vagueza em ingles

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product
- **Affects specs:** structure structure

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

A checagem de gatilho detectavel de skill so enxerga vagueza em ingles: a lista de frases vagas e um regex so em ingles e a lista de stopwords do fallback tambem, entao quando fizer sentido e sempre que parecer util passam como gatilhos concretos num framework que suporta projetos em portugues. O lexico compartilhado ja carrega as duas linguas e este modulo mantem uma copia privada so em ingles.

## What

A lista de frases vagas vira duas, espelhadas, uma por língua, casadas
contra o texto DOBRADO — `necessário` e `necessario` são a mesma frase.

O piso de ranqueabilidade passa a contar palavras de conteúdo pelo léxico
compartilhado de `lib/lexicon.js`, que já carrega as duas línguas, em vez
da lista privada só em inglês que este módulo mantinha. Era ela que fazia
`quando` e `que` contarem como distintivas.

As listas ficam espelhadas nas duas direções: `sense` e `right` entram no
inglês porque `sentido` e `certo` são canônicos em português.

Artefatos: `packages/doctrina-cli/src/lib/validation-model.js`,
`docs/{en,pt}/cli-reference.md`,
`packages/doctrina-cli/test/um-gatilho-vago-e-vago-nas-duas-linguas.test.js`
(novo).

## Scope boundaries

Um gatilho concreto continua passando nas duas línguas, e uma palavra vaga
dentro de uma frase concreta não torna o gatilho vago: as listas são
ancoradas na frase inteira, não varrem por palavra-chave. Tem caso de teste
para isso.

Nenhuma das nove skills deste repositório passa a avisar — conferido antes
de aceitar a mudança.

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
- [x] A mesma vagueza recebe a mesma leitura nas duas línguas, o acento não
      decide nada, e o módulo lê texto pelo léxico compartilhado — provado em
      `packages/doctrina-cli/test/um-gatilho-vago-e-vago-nas-duas-linguas.test.js`,
      que reprova cinco dos sete casos no código anterior.

## Open questions

Nenhuma.
