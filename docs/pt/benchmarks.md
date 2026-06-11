# Benchmarks

> Tradução da [versão em inglês](../en/benchmarks.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Números sintéticos de benchmark para o CLI Doctrina. Re-runnable
no seu próprio hardware via `scripts/bench.js`. Esses números são
referência, não garantia; mostram características de performance
em ordem de grandeza, não medições de adoção real.

## Por que shippamos benchmarks sintéticos

Adopters avaliando Doctrina contra o CLI Python do Spec Kit
perguntam se a postura zero-deps se traduz em ganho real de
tempo. Números sintéticos respondem à pergunta de ordem de
grandeza: "isso é rápido o suficiente para eu não notar num
pre-commit hook?" A resposta honesta precisa de números, não
adjetivos.

O que benchmarks sintéticos **não** respondem:

- Performance de adoção real na forma específica do seu
  repositório.
- Comparações cross-framework contra Spec Kit, OpenSpec, BMAD ou
  Kiro. Não instalamos esses frameworks aqui; puxá-los traria
  dependências transitivas que contradizem a postura zero-deps.
- Comportamento cold-cache vs warm-cache de disco além do que os
  projetos sintéticos gerados exercitam.

## O que o script de bench faz

`scripts/bench.js` gera três projetos sintéticos Doctrina:

| Tamanho | Specs | ADRs | Changes arquivadas |
|---------|-------|------|--------------------|
| small   | 1     | 1    | 1                  |
| medium  | 10    | 5    | 10                 |
| large   | 50    | 20   | 50                 |

Para cada tamanho, o script roda `doctrina validate` e
`doctrina clarify` cinco vezes e reporta o tempo mediano em
milissegundos. `doctrina analyze` é excluído do loop sintético
porque requer uma pasta de change aberta (não arquivada), e
semear uma realisticamente enviesaria o bench para custo de
geração de artefatos em vez de custo de CLI.

## Run de referência

Host do mantenedor, junho/2026 (`node --version` v22.x em Linux):

```
Doctrina bench — 5 iterations per size

size     specs  ADRs  archived  validate  analyze*  clarify**
-------  -----  ----  --------  --------  --------  ---------
small        1     1         1    ~85 ms        n/a   ~80 ms
medium      10     5        10    ~85 ms        n/a   ~80 ms
large       50    20        50    ~90 ms        n/a   ~82 ms
```

Números variam ±10 ms entre runs no mesmo hardware. O headline:
mesmo com 50 specs de capability mais 20 ADRs mais 50 changes
arquivadas — bem acima da escala de primeiro ano de um projeto
real — `doctrina validate` fica abaixo de 100 ms. Isso impede o
pre-commit hook de ser uma espera perceptível ao dev.

A curva tamanho-vs-tempo é aproximadamente plana. O trabalho do
validate é dominado pelo custo de startup do Node.js, não pela
caminhada na árvore `.doctrina/`. Clarify é similarmente
dominado; o pass de regex por-spec é erro de arredondamento.

## Re-rodando no seu hardware

```
node scripts/bench.js                 # default 5 iterações por tamanho
node scripts/bench.js --iterations 20 # para medianas mais apertadas
```

O script escreve projetos sintéticos sob o diretório temp do seu
OS e limpa depois de cada tamanho. Sem network calls, sem state
fora de `/tmp` (ou equivalente local).

## Quando os números mudam

Três mudanças no Doctrina invalidariam a tabela de referência:

1. Adicionar uma dependência de runtime. Qualquer import fora da
   stdlib desloca o custo de startup do Node; a tabela seria
   re-baselined.
2. Substituir a abordagem walk-and-stat do `validate` por um
   índice cacheado. Isso só importaria em escalas muito grandes
   (milhares de specs), e não está no roadmap.
3. Adicionar uma network call. Doctrina não faz nenhuma
   (veja `SECURITY.md`); isso seria violação de policy, não
   mudança de performance.

## Material relacionado

- [Engenharia de contexto](context-engineering.md) — por que
  timing importa mesmo para um CLI fino.
- [Validação](validation.md) — o protocolo A/B empírico para
  medir impacto real no seu projeto.
- [`scripts/bench.js`](../../scripts/bench.js) — o script
  em si.
