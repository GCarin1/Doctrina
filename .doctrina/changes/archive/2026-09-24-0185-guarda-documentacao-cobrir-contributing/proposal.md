# Change 0185-guarda-documentacao-cobrir-contributing — o guarda de documentação lê toda página de instrução

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** docs

- **Documented surface:** n/a — só o teste do guarda de documentação muda; `analyze` e `close` aparecem como nomes que o guarda procura, nenhum comando muda


## Why

O guarda criado na 0179 só lia os READMEs e `docs/`. Por isso a auditoria
pós-0182 achou `analyze` ensinado no CONTRIBUTING.md, no template de PR,
num exemplo, em duas skills e no `product.md`, as regras de contribuição
proibindo o workflow que o repositório roda, e um AGENTS.md de teste
esquecido no pacote — tudo corrigido à mão na 0184, nada impedindo que
volte.

## What

- `a-documentacao-acompanha-o-catalogo.test.js` passa a ler toda página
  de instrução: CONTRIBUTING, AGENTS.md, `.github/`, skills,
  `product.md`, templates, slash commands instalados e exemplos.
- Dois testes novos: as páginas de contribuição nomeiam `doctrina close`
  e nunca dizem que o archive deve ficar vazio; um AGENTS.md só existe na
  raiz e nos exemplos.
- Spec `docs`: um requisito e um critério verificado.

## Scope boundaries

- ADRs e changes arquivadas ficam de fora: são registro histórico.
- As specs podem descrever comandos depreciados enquanto eles existirem.

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

