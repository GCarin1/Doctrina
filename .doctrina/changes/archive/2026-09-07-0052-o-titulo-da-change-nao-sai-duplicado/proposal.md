# Change 0052-o-titulo-da-change-nao-sai-duplicado — o titulo da change nao sai duplicado

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** validation, insight

## Why

o parser de titulo de change em openChanges usa um regex cuja classe negada para no primeiro hifen do id, entao todo id multi-palavra sai com o titulo duplicado em prime e handoff; corrigir o parser e provar a correcao com um criterio de aceitacao que cite o teste de regressao

## What

Corrige o parser de título de change em `openChanges()`
(`packages/doctrina-cli/src/commands/prime.js`). O regex é
`/^#\s+(?:Change\s+[^—-]*[—-]\s*)?(.+)$/m`: a classe negada `[^—-]*` para no
primeiro hífen encontrado, que num id `NNNN-slug` é o hífen do próprio id, e não
o travessão que separa o id do título.

Comportamento medido:

| H1 | capturado |
|---|---|
| `# Change 0029 — Doctrina checks the operational surface` | `Doctrina checks the operational surface` |
| `# Change 0030-declare-the-release-wiring — declare the release wiring` | `declare-the-release-wiring — declare the release wiring` |

Ou seja: o defeito só não aparece quando o id não tem hífen, que é o caso raro.
Todo id multi-palavra — a norma que `work` gera — sai com o slug colado antes do
título.

Três superfícies consomem `openChanges()` e portanto imprimem o título assim:
`prime` (dono da função), `handoff` e `report`.

A correção é ancorar o grupo opcional no separador em vez de em qualquer hífen —
o id não contém espaço, então `Change\s+\S+\s*[—-]\s*` delimita corretamente. O
delta acrescenta um critério de aceitação citando o teste de regressão.

Achado durante a encenação do backlog desta auditoria: apareceu no `prime` assim
que as 20 changes com id multi-palavra foram abertas.

## Scope boundaries

- Não move `openChanges()` para uma lib nem remove o import entre módulos de comando: isso é a change 0037, e as duas tocam o mesmo arquivo.
- Não muda o formato do H1 gerado pelo template de proposta; o parser é que está errado, não o dado.
- Não toca a extração de título de specs nem de ADRs, que usam outros parsers.
- Os deltas mudaram de `gates` para `validation` (o dono do document model,
  onde o parser passou a morar) e `insight` (dona de `prime`, `handoff` e
  `report` desde a change 0053). A proposta foi escrita antes dessas duas
  divisões; a capability não mudou, o nome dela mudou.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um id multi-palavra rende só o título em `prime`, `handoff` e `report`.
- [x] Um id sem hífen (`0029`) continua rendendo o mesmo título de antes — sem regressão.
- [x] Um H1 sem o prefixo `Change <id> —` continua sendo capturado inteiro.
- [x] Um teste fixa as três formas, incluindo a degenerada `# Change 0052-x` sem separador.

## Open questions

- **Aceitar `-` além de `—`? — Resolvido: os dois, porque o caractere nunca
  foi a ambiguidade.** A premissa da pergunta está errada: o que quebrava não
  era aceitar o hífen, era não ancorar nada. O separador que o template
  escreve tem ESPAÇO dos dois lados; os hifens de um id (`NNNN-slug`) nunca
  têm. Ancorar em `\s+[—-]\s+` resolve por completo — `0030-declare-the-wiring
  — título` casa o travessão e nada mais — e continua lendo um H1 escrito à
  mão com ` - `. Exigir o travessão tornaria o parser mais restritivo sem
  tornar nenhum caso menos ambíguo, e quebraria quem escreve com hífen: custo
  sem ganho.
- **Uma correção ou quatro?** O regex quebrado estava em quatro lugares, e em
  duas variantes diferentes: `[^—-]*` (que parava no primeiro hífen do id, o
  defeito relatado) e `\s*[—-]\s*` (que aceitava hífen sem espaços, e num H1
  sem separador lia o último pedaço do id como título). Corrigir só o
  relatado deixaria três cópias e um segundo defeito latente, então o parser
  virou `parseChangeTitle` no document model — que é onde o ADR 0021 já dizia
  que a gramática on-disk mora — e os quatro chamadores passaram a lê-lo de
  lá. Um teste fixa que nenhum módulo fora do document model carrega a
  gramática de novo.
