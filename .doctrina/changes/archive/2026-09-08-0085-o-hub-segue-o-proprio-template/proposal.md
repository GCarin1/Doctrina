# Change 0085-o-hub-segue-o-proprio-template — o hub segue o proprio template

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** (none — chore)

## Why

o AGENTS.md deste repo consolidou stack, comandos e layout numa secao so, entao as duas secoes recomendadas ficam invisiveis para o gate e para o agente que procura por elas, enquanto o proprio template do doctrina ja as separa

## What

```
✗ AGENTS.md missing recommended section "## Commands"
✗ AGENTS.md missing recommended section "## Repository structure"
```

O conteúdo das duas **está lá** — os comandos e o layout do repositório vivem
dentro de `## Stack, layout and commands`. O que falta é o título que o gate,
e o agente, procuram. `## Stack` casa por prefixo com o cabeçalho
consolidado; as outras duas não casam com nada.

O próprio template que o Doctrina distribui já separa as três
(`## Stack and tooling`, `## Commands`, `## Repository structure`). O hub deste
repositório é o único que não segue a recomendação que ele mesmo emite — e é
o arquivo que todo agente lê primeiro.

Dividir custa 4 linhas (dois cabeçalhos e suas linhas em branco) e o
AGENTS.md tem 3 de folga em 150, então a change também compacta duas
passagens que já estão mais curtas no template distribuído: a introdução dos
invariantes e o `## Definition of done`, que o template resume em «`doctrina
close <id>` is the definition». Corte de 5, gasto de 4.

## O gate de docs disparou, e foi um falso positivo

O passo 10/12 do close recusou: «this change alters a documented surface but
no docs/ change accompanies it — commands: close, templates».

Os dois sinais vêm desta proposta: ela cita `doctrina templates check` (o
gate que reportou o achado) e `` `doctrina close <id>` `` (a frase que passa
a estar no hub). Nenhum dos dois comandos muda de comportamento aqui — eles
foram citados para DESCREVER o problema, não para alterá-lo.

Fechada com `--force`, que registra a lacuna em vez de escondê-la. Escrever
documentação inventada para satisfazer o gate, ou reescrever esta proposta
para não citar os comandos, seriam as duas saídas desonestas. O falso
positivo — citar um comando ao explicar um sintoma conta como mexer nele —
fica anotado para virar change própria.

## Scope boundaries

- Não sobe o teto de 150 linhas nem mexe no bloco gerado da superfície.
- Não muda a lista de seções recomendadas: o hub é que passa a segui-la.
- Chore: nenhuma spec muda, nenhum comportamento do CLI muda.

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
- [x] `doctrina templates check` deixa de reportar seção recomendada ausente.
- [x] O AGENTS.md continua abaixo do teto, com folga.
- [x] Nenhuma informação some: o que estava na seção consolidada continua lá.

## Open questions

- Nenhuma.
