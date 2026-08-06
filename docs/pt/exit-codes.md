# Códigos de saída

> Tradução da [versão em inglês](../en/exit-codes.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Todo comando `doctrina` sai com um de cinco códigos. O código é um
**contrato**: diz a um consumidor de máquina o que fazer em seguida, sem
interpretar texto em inglês. Combinado com `--json`, um agente nunca
precisa ler prosa.

## As cinco classes

| Código | Classe | Significado | O que fazer |
|--------|--------|-------------|-------------|
| `0` | OK | Sucesso. Warnings são permitidos. | Continue. |
| `1` | GATE | Um gate falhou — **o trabalho não está pronto**. | Corrija o trabalho e repita o mesmo comando. |
| `2` | USAGE | **A invocação está errada** — comando desconhecido, argumento ausente ou malformado. | Não repita sem mudar. Corrija a linha de comando. |
| `3` | PRECONDITION | **Falta uma precondição** — o projeto ainda não está preparado para isso. | Rode o comando de setup nomeado no erro e repita. |
| `4` | ENVIRONMENT | **O ambiente não consegue executar** — uma ferramenta ausente, árvore ilegível. | Pare. Repetir não vai ajudar. |

O `doctrina --help` imprime a mesma tabela, gerada da mesma fonte, então
as duas não podem divergir.

## Por que isso importa

Antes deste contrato, o código `1` significava três coisas diferentes:

- `doctrina validate` falhando — *sua change não está pronta*
- `doctrina verify` sem `verify.json` — *este projeto não está configurado*
- `doctrina metrics` num repo sem commits — *esta máquina não consegue rodar*

O primeiro significa iterar. O segundo, rodar outro comando antes. O
terceiro, desistir. Um loop autônomo que não distingue os três ou fica
girando numa falha insolúvel ou abandona uma que tinha conserto.

## Lendo as classes na prática

**`1` — o trabalho.** `validate`, `analyze`, `coverage --strict`,
`trace --strict`, `close`, `verify` com uma checagem que falhou, e
qualquer transição de ciclo de vida recusada. Algo que você escreveu
precisa mudar.

**`2` — a linha de comando.** Comando ou subcomando desconhecido,
argumento obrigatório ausente, id malformado. Repetir a mesma string vai
falhar do mesmo jeito.

**`3` — o setup.** Rodar fora de um projeto Doctrina (`doctrina init`),
`verify` sem `.doctrina/verify.json` (`doctrina verify --init`), `intake`
sem nada guardado e sem descrição. O erro nomeia o comando que resolve; o
CLI o imprime como linha `hint:`.

**`4` — a máquina.** Reservado para condições que nenhuma repetição
conserta: uma ferramenta externa obrigatória ausente, uma árvore ilegível.
Note que "isto não é um repositório git" geralmente **não** é `4` —
comandos que conseguem degradar sem git fazem isso e saem com `0`.

## Para agentes

```
0 -> continue
1 -> corrija o trabalho, repita o mesmo comando
2 -> corrija a invocação; não repita sem mudar
3 -> rode o comando de setup da linha `hint:` e repita
4 -> pare
```

Uma transição forçada (`--force`) transforma uma recusa em sucesso e
registra o gap em `.doctrina/changes/archive/LEDGER.md`, então um `0`
obtido por força continua visível na história.

Veja o ADR 0018 para o raciocínio e as alternativas consideradas.
