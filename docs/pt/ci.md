# Integração com CI — os gates no seu pipeline

> Tradução da [versão em inglês](../en/ci.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Os gates do Doctrina são comandos comuns com códigos de saída, então
qualquer CI consegue rodá-los. Esta página traz os dois caminhos
prontos: a GitHub Action oficial e um script simples para os demais CIs.

## GitHub Action (recomendado)

A raiz do repositório publica uma action composta que roda os quatro
gates estruturais — `validate`, `index rebuild --check`,
`coverage --strict`, `trace --strict` — num passo só:

```yaml
# .github/workflows/doctrina.yml
name: Doctrina gates
on:
  pull_request:

jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - uses: GCarin1/Doctrina@main   # em projetos reais, pinne uma tag
        with:
          strict: "true"              # "false" = só relatório (fase de adoção)
```

Inputs:

| Input | Default | Função |
|-------|---------|--------|
| `strict` | `"true"` | Roda `coverage`/`trace` com `--strict` (falha em qualquer lacuna). Use `"false"` durante o backfill de um projeto brownfield — o estado honesto é vermelho, e isso é esperado no começo (veja [Adoção brownfield](brownfield.md)). |
| `version` | `latest` | Versão do `doctrina-cli` executada via `npx`. |
| `working-directory` | `.` | Diretório que contém a árvore `.doctrina/`. |
| `run-prefix` | vazio | Substitui a invocação do CLI por inteiro (o CI deste próprio repo aponta para o código-fonte da working tree). |

## Qualquer outro CI (script simples)

A action são quatro comandos; rode-os onde quiser:

```bash
npx --yes doctrina-cli validate
npx --yes doctrina-cli index rebuild --check
npx --yes doctrina-cli coverage --strict
npx --yes doctrina-cli trace --strict
```

Adicione `doctrina verify` onde o pipeline também deva rodar o gate de
build declarado pelo projeto (testes/typecheck/build) — é o check lento
e autoritativo, deliberadamente fora da action estrutural.

## Saída machine-readable

`status`, `next`, `validate`, `coverage` e `trace` aceitam `--json`
para pipelines que roteiam achados para outros lugares (anotações de
PR, dashboards):

```bash
doctrina validate --json | jq '.errors'
doctrina coverage --json | jq '.summary.pct'
```

## Ratchet local vs gate de CI

O hook de pre-commit (`doctrina hooks install`) roda `validate --fix` —
ele *cura* drift de index localmente. O CI roda os checks read-only e
*falha* no drift: o que chega ao remoto já precisa estar limpo. Os dois
são complementares, não redundantes.

## Material relacionado

- [Gating](gating.md) — quando o pipeline completo se paga.
- [Referência do CLI](cli-reference.md) — todos os comandos e flags.
- [Validação](validation.md) — o protocolo A/B que os números do CI alimentam.
