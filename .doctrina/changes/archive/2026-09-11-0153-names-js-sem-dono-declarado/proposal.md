# Change 0153-names-js-sem-dono-declarado — names.js sem dono declarado

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** authoring, gates
- **Documented surface:** n/a — o cabeçalho `Source:` reescrito relista os arquivos que a capability já possuía; nenhum comando, flag ou saída muda authoring

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

O modulo lib/names.js nao e declarado no cabecalho Source de nenhuma spec: ele so ganha dono pela inferencia que a ADR 0027 existe para substituir. O teste que deveria cobrar a declaracao pergunta se existe algum dono, nao se existe um declarado, entao nao ve a diferenca.

## What

`lib/work-model.js` ganha `declaredOwners(projectRoot, file)`: a pergunta
da ADR 0027 feita direto, sem inferência na resposta.

O teste de posse passa a usá-la. Ele perguntava à função de ranqueamento
se havia "alguma capability dona" — e essa função cai para inferências de
propósito, para que um projeto que ainda não declarou nada receba um
palpite. Então um arquivo que spec nenhuma nomeia voltava com dono, com
nota 5 em vez de 10, e o teste não via diferença.

Com a pergunta certa aparecem dois arquivos não declarados:
`lib/names.js`, a gramática de nome que `spec new`, `contract new` e
`skill new` usam, e `scripts/e2e-packed.mjs`, o harness de instalação
empacotada. O primeiro vai para `authoring`, o segundo para `gates`, ao
lado do benchmark e da action.

Artefatos: `packages/doctrina-cli/src/lib/work-model.js`,
`packages/doctrina-cli/test/code-has-an-owner.test.js`, deltas nas specs
`authoring` e `gates`.

## Scope boundaries

`rankCapabilitiesByDiff` não muda: a queda para inferências é o que faz o
palpite do playbook e do review servirem num projeto que ainda não
declarou nada. O erro não era ela inferir — era um gate de declaração
perguntar a ela.

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
- [x] Todo arquivo rastreado é declarado por uma capability, e uma menção
      não conta como declaração, provado em
      `packages/doctrina-cli/test/code-has-an-owner.test.js`.

## Open questions

Nenhuma.
