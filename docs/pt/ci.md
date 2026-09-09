# Integração com CI — os gates no seu pipeline

> Tradução da [versão em inglês](../en/ci.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Os gates do Doctrina são comandos comuns com códigos de saída, então
qualquer CI consegue rodá-los. Esta página traz os dois caminhos
prontos: a GitHub Action oficial e um script simples para os demais CIs.

## GitHub Action (recomendado)

A raiz do repositório publica uma action composta que roda o conjunto de
gates — `validate`, `index rebuild --check`, `contract check`,
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
npx --yes doctrina-cli contract check
npx --yes doctrina-cli coverage --strict
npx --yes doctrina-cli trace --strict
```

Adicione `doctrina verify` onde o pipeline também deva rodar o gate de
build declarado pelo projeto (testes/typecheck/build) — é o check lento
e autoritativo, deliberadamente fora da action estrutural.

## O gate de runtime no CI

Todos os outros passos leem Markdown. O `contract check` lê o que o
Markdown *afirma sobre o sistema em execução* e cobra isso da
implementação — os checks RT01-RT05: uma variável que o contrato declara
sob `vars`/`secrets` e que nenhum workflow exporta, um default do
consumidor que um valor vazio do CI nunca dispara, um enum declarado que
ninguém valida, um seletor que casa com zero alvos e mesmo assim sai 0.
É a classe de quebra que nenhum gate estrutural enxerga, porque os
artefatos estão todos bem formados.

Ele **não** depende do `strict`: uma declaração que não vale é erro em
qualquer estágio de adoção. Um projeto sem contratos imprime uma linha e
sai 0, então acrescentar o passo a um pipeline existente é um no-op até a
primeira linha de `Wiring` ou `Selectors` ser declarada. Os mesmos checks
rodam dentro do `doctrina close` (o passo `runtime`), então a quebra é
pega antes do push, não só no pipeline.

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

## Ponta a ponta: a instalação empacotada

As suítes unitária e de integração rodam o CLI a partir do próprio
repositório, onde os templates resolvem para o `.doctrina/` do Doctrina, os
adapters já estão presentes e o `index.json` é o do repo, não um que o
`init` acabou de escrever. Três defeitos reais eram invisíveis desse ponto
de vista.

O `scripts/e2e-packed.mjs` roda o CLI do jeito que um usuário instala:

```
node scripts/e2e-packed.mjs          # execução completa
node scripts/e2e-packed.mjs --quick  # pula a varredura por adapter
```

Ele empacota o tarball, instala num diretório temporário **fora** do repo e
conduz um projeto real por todo o ciclo — `init` → `spec new` → `work` →
delta → `change check` → `close` → archive — com o binário instalado,
verificando que `validate`, `templates check` e `doctor` estão verdes em
cada passo. Depois instala cada um dos doze adapters em seu próprio projeto
e checa todos.

O `--repo <caminho>` o aponta para outro checkout, que foi como ele se
provou: rodado contra o commit anterior às correções, ele reproduz os
defeitos que agora guarda. O CI o executa em Linux e Windows, porque
tratamento de caminhos é uma falha plausível que a suíte in-repo não vê.
