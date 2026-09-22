# Change 0159-enumeracoes-do-que-um-driver-roda-ficaram-velhas — enumeracoes do que um driver roda ficaram velhas

- **Status:** applied
- **Applied:** 2026-09-22
- **Date:** 2026-09-22
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** docs, gates docs

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

Duas enumeracoes de o que um driver roda ficaram para tras. Onze trechos de documentacao dizem que o hook de pre-commit roda validate --fix, e desde a change 0156 ele roda duas coisas. E o contrato system enumera cinco dos seis passos da action composta, sem o gate de orcamento de contexto. A change 0150 ja provou esse padrao para a sequencia de fechamento; o teste que ela deixou so cobre aquela cadeia.

## What

Onze trechos em EN e PT passam a nomear as duas checagens que o hook roda.
E a seção Interfaces do contrato `system` passa a nomear os seis passos da
action, dizendo de onde a lista vem.

Um teste novo prende as duas coisas à declaração de cada uma: as invocações
que o template do hook realmente faz, e a sequência de CI em `lib/gates.js`.
Ele casa pela INVOCAÇÃO inteira, não pelo nome do comando — `validate`
sozinho aparece em metade da documentação por outros motivos, e um detector
que dispara nisso reporta toda página como se fosse uma afirmação sobre o
hook.

Artefatos: `docs/{en,pt}/{README,adoption-playbook,ci,flow,cli-reference}.md`,
`.doctrina/contracts/system.md`,
`packages/doctrina-cli/test/o-que-um-driver-roda-tem-um-autor.test.js` (novo).

## Scope boundaries

Nenhum comportamento muda: o hook e a action já rodavam o que rodam. O que
muda é a prosa dizer isso, e passar a ser cobrada.

Uma página que só manda instalar o hook continua livre — ela não afirma
nada sobre o conteúdo dele. O teste só alcança quem escreve a invocação.

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
- [x] Toda passagem que diz o que o hook roda nomeia as duas checagens, e a
      lista do contrato bate com a sequência de CI declarada — provado em
      `packages/doctrina-cli/test/o-que-um-driver-roda-tem-um-autor.test.js`,
      que reprova o conteúdo anterior dos dois arquivos.

## Open questions

Nenhuma.
