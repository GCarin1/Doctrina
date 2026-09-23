# Change 0163-regra-de-projeto-com-glob-morto-e-silenciosa — regra de projeto com glob morto e silenciosa

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** runtime (uncertain; signals: seletor)
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

Uma regra de projeto cujo paths nao casa com arquivo nenhum e silenciosa: a restricao fica declarada, nunca roda, o validate sai zero e o doctor ainda conta ela como configurada. O mesmo framework ja cobra isso de um glob Source numa spec e de um seletor RT05 num contrato, com a razao escrita no codigo: uma declaracao que nao alcanca nada le como cobertura e nao entrega nenhuma.

## What

`checkProjectRules` passa a contar quantos arquivos cada regra ALCANÇOU, e
a avisar quando uma regra com escopo declarado não alcançou nenhum. Aviso,
não erro — a mesma severidade que o glob `Source:` morto já tem.

A contagem acontece ANTES do teto de ocorrências por regra: uma regra
barulhenta o bastante para ter as ocorrências suprimidas obviamente
alcançou arquivos, e contar depois a faria parecer morta.

Omitir `paths` não é escopo morto: não é uma afirmação sobre onde a regra
se aplica, é a regra cobrindo a árvore. Só um escopo declarado pode morrer.

Artefatos: `packages/doctrina-cli/src/lib/validation-model.js`,
`docs/{en,pt}/cli-reference.md`,
`packages/doctrina-cli/test/uma-regra-que-nao-alcanca-nada.test.js` (novo).

## Scope boundaries

Uma regra que alcança arquivos e não encontra violação continua calada —
isso é uma regra saudável, não uma morta. E uma violação continua sendo
erro, com a mensagem que a regra declara.

O `doctor` não muda: ele conta regras configuradas, e uma regra com escopo
morto CONTINUA configurada. Quem diz que ela não alcança nada é o
`validate`, que é quem a executa.

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
- [x] Um escopo morto é reportado, e os quatro casos que devem continuar
      como estavam continuam — provado em
      `packages/doctrina-cli/test/uma-regra-que-nao-alcanca-nada.test.js`,
      que reprova o código anterior no primeiro caso.

## Open questions

Nenhuma.
