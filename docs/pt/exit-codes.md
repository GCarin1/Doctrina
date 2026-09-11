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
argumento obrigatório ausente, id malformado e **uma referência que não
resolve** — uma capability sem spec, um id de change que não está aberto,
um número de ADR que ninguém escreveu, um requisito ou critério que a spec
não declara. Repetir a mesma string vai falhar do mesmo jeito, então o que
se corrige é a string: `show`, `why`, `context`, `change check`,
`spec set`, `decision accept`, `decision scope`, `analyze` e
`coverage --only` respondem `2` a um nome que não encontram. Nomear uma
capability que uma change aberta está preparando com um delta **não** é
uma referência que não resolve — `doctrina context <cap>` é exatamente a
leitura para escrever essa spec.

**Não achar não é falhar.** Uma vista monta o que existe. `search` sem
resultado, e toda `list` sem nada para listar, dizem que não acharam e
saem `0`. Só um gate reporta `1`, e um gate é algo que mediu trabalho real
e o reprovou.

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

## A saída faz parte do contrato

Um código de saída diz o que aconteceu. A saída diz o que foi encontrado
— e um comando que imprime só terminou quando cada byte que ele imprimiu
de fato deixou o processo.

Isso é uma garantia real, não uma obviedade. O Node bufferiza escritas
para pipe, então um CLI que termina com `process.exit()` pode entregar
uma resposta truncada com um `0` ao lado: o código está certo, a saída
está curta, e nada em lugar nenhum reporta falha. O tamanho do buffer de
pipe varia por plataforma, então o mesmo comando pode vir inteiro no
Linux e cortado no macOS.

O Doctrina define o código de saída e deixa o Node terminar, e escoar o
stdout faz parte de terminar. Então:

```
doctrina context --concat | sua-ferramenta   # chega inteiro
doctrina context --concat > pack.txt         # os mesmos bytes
```

Para um agente vale dizer sem rodeio: **se o código de saída é 0, a saída
que você recebeu é a saída inteira.** Nunca é preciso adivinhar se um
pacote acabou porque acabou ou porque o pipe acabou.
