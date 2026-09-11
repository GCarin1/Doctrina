# Change 0147-modulo-skills-normaliza-nomes — o slug de skill dobra o acento em vez de apagá-lo

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product
- **Affects specs:** skills
- **Documented surface:** n/a — cita `SLUG_NOISE` como a pista que denunciava o defeito; nenhum nome documentado muda

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

O módulo de skills normaliza nomes com classes só-ASCII em vez do fold compartilhado: acentos e maiúsculas viram hifens, então 'não lê o cabeçalho' vira 'n-o-l-o-cabe-alho' e 'Corrigir A Validação' vira 'orrigir-alida-o'. Rotear skillSlug e a deduplicação de tokens pelo fold() de lib/lexicon.js.

## What

`skillSlug()` em `packages/doctrina-cli/src/commands/skill.js` passa a
dobrar o texto pelo `fold()` de `packages/doctrina-cli/src/lib/lexicon.js`
antes de recortar o slug, e a deduplicação por token normalizado faz o
mesmo. `commitSlug()` deixa de repetir o recorte à mão e delega.

O slug resultante também passa a começar por letra, como a spec de skills
já exigia: um prefixo puramente numérico (o id da change de origem) é
descartado em vez de virar a primeira letra do nome de arquivo.

Artefatos: `packages/doctrina-cli/src/commands/skill.js`,
`packages/doctrina-cli/test/o-acento-nao-e-ruido.test.js` (novo),
delta na spec `skills`.

## Scope boundaries

O conjunto `SLUG_NOISE` e a semelhança por sobreposição de tokens ficam
como estão: passam a receber slugs dobrados, que é o formato que já
assumiam. Nenhum arquivo de skill existente é renomeado — o defeito está
no nome que o módulo *gera*, e um renomeio mexeria em memória autorada.

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
- [x] Um texto acentuado e capitalizado produz o slug dobrado, provado em
      `packages/doctrina-cli/test/o-acento-nao-e-ruido.test.js`.
- [x] Todo slug gerado casa com `[a-z][a-z0-9-]*`, a forma que a spec de
      skills já exigia, provado no mesmo arquivo de teste.

## Open questions

Nenhuma.
