# Change 0065-o-molde-nao-passa-por-conteudo — o molde nao passa por conteudo

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** validation, authoring

## Why

o scaffold do proprio framework passa por conteudo autoral: o decision accept aceita um ADR cujo corpo e 100 por cento comentario de template e ele vira regra imutavel, e uma spec inteiramente de molde passa no validate e no clarify ate o placeholder derrubar o close de outra change

## What

O Doctrina escreve os artefatos a partir de templates e depois confia que alguém
os preencheu. Um único gate verifica isso — o `analyze`, sobre o `proposal.md` de
uma change. Todos os outros aceitam o texto do molde como decisão tomada.

- O `decision accept` aceita um ADR cujas seções Context, Decision e Consequences
  são 100% comentário de template. Um ADR aceito é imutável, vira regra vigente
  no `prime --rules` e entra inteiro em todo pacote de contexto (ADR 0022). O
  `validate` depois avisa — mas só sobre a falta de `Evidence`, nunca sobre o
  corpo vazio.
- Uma spec inteiramente de molde passa no `validate` e no `clarify`. A função que
  detecta isso já existe — `isUntouchedScaffold`, no document model — e é usada
  num único lugar: decidir se um delta ADDED colide com uma spec existente. O
  custo aparece dias depois: o critério placeholder
  `<observable signal> — verified by path/to/test` sobreviveu até uma spec
  `active` e derrubou o `close` de uma change que não tinha relação com ele.

A régua para isso já foi escrita nesta casa. A change 0057 ensinou o framework
que um valor de header ainda entre `<…>` conta como ausente
(`isPlaceholderHeaderValue`). Falta aplicá-la onde o molde ainda passa.

## Scope boundaries

- Não recusa um rascunho: uma spec `draft` sendo escrita continua livre. O alvo é
  o molde intocado, não o trabalho em andamento.
- Não torna o corpo vazio de ADR um erro do `validate` — o ponto de recusa é o
  `accept`, onde a decisão vira imutável.
- Não muda os templates: o problema é quem lê, não o que está escrito neles.

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

## Open questions

- Nenhuma.
- [ ] `decision accept` recusa um ADR cujo corpo ainda é o molde, e nomeia o que falta.
- [ ] Um ADR com uma decisão escrita de uma linha é aceito sem cerimônia.
- [ ] Um critério de aceitação ainda no formato placeholder é reportado antes do close, não durante.
- [ ] Os testes rodam contra artefatos que o próprio CLI scaffoldou.
