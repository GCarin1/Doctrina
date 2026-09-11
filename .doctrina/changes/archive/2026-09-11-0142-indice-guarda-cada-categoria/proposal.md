# Change 0142-indice-guarda-cada-categoria — o indice guarda cada categoria na mesma ordem que o rebuild produz, em vez de acrescentar no fim

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** scaffolding
- **Documented surface:** n/a — nomeia `index rebuild --check` e os comandos que criam artefatos para situar o defeito; nenhum comando, flag ou código de saída muda

## Why

O `index.json` é escrito por dois caminhos. Incrementalmente, pelo comando
que cria o artefato — `spec new`, `skill new`, `contract new`,
`decision new`, `change archive` —, e por inteiro pelo `index rebuild`, que
percorre o diretório com `readdirSync(...).sort()` e escreve o que encontra
naquela ordem.

Os cinco pontos de inserção faziam `push` no fim da lista. Isso coincide
com uma varredura ordenada exatamente quando a entrada nova ordena por
último — e normalmente ordena, que é como o defeito sobreviveu.

Quando não ordena, o índice fica derivado na hora. Dois comandos num
projeto recém-criado bastam:

    doctrina spec new zebra
    doctrina spec new alpha
    doctrina index rebuild --check   →  fail: index.json has drifted

E o `validate` não vê. Deriva desse tipo só aparece reconstruindo e
comparando, que é outro gate. Então a árvore parece saudável por dentro e
reprova por fora.

Não é hipotético: aconteceu. A change 0138 foi arquivada depois da 0139,
porque a 0139 destravava a 0138. O `close` reportou verde, o commit subiu,
e as seis pernas de teste do CI ficaram vermelhas no run 58 — `doctor`
acusando `index.json has drifted from the tree`. O commit seguinte, que só
mexia em documentação, "consertou" por acidente, porque o `close` dele
regravou o índice.

Um defeito que se cura sozinho no commit seguinte é o pior tipo de
defeito: ninguém investiga o que já passou.

## What

Um helper único, `insertInRebuildOrder`, coloca a entrada onde a varredura
a colocaria, e os cinco pontos de inserção passam a usá-lo.

A ordenação é pelo `path` da entrada, que carrega o nome em disco pelo qual
o rebuild ordena, e cujo diretório-pai é constante dentro de uma categoria.
Assim este módulo reproduz a varredura sem precisar saber como cada
categoria é disposta.

A comparação é a **mesma**: `readdirSync(...).sort()` usa o comparador
padrão, que ordena por code unit UTF-16. O `localeCompare` não — ele
reescala pontuação, e poria `a-b` e `ab` na ordem oposta. Casar com a
varredura é comparar como a varredura compara, e um teste fixa isso com
nomes que diferem só na pontuação.

## Scope boundaries

Não altera a forma de nenhuma entrada nem o esquema do `index.json`: só a
posição em que uma entrada nova é inserida.

Não faz o `validate` enxergar esta classe de deriva. A comparação contra
um rebuild é cara e já tem gate próprio; fazer o `validate` reconstruir a
árvore a cada execução trocaria um defeito por uma lentidão. A rede que
faltava no `close` é trabalho da change seguinte.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] A reprodução de dois comandos deixa de derivar.
- [x] Arquivar changes fora de ordem numérica deixa de derivar.
- [x] A ordem casa com a da varredura para nomes que diferem só na pontuação.

## Open questions

Nenhuma.
