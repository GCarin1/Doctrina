# Change 0124-security-md-descreve-subprocessos — SECURITY.md descreve os subprocessos que o CLI realmente executa

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

A política declarava, sob "Posture and commitments":

> **No process spawning beyond declared commands.** The CLI does not
> invoke subprocesses except the pre-commit hook it installs at the
> user's request.

Falso em duas frentes. Onze módulos consultam `git` como subprocesso
através de `src/lib/git.js`. E `doctrina verify` executa as strings de
shell declaradas em `.doctrina/verify.json`, assim como `doctrina
coverage --run` executa o `evidence_runner` do mesmo arquivo.

O comportamento é correto e é o contrato desses comandos. O defeito é a
política afirmar o contrário, e ele é pior do que uma imprecisão: o texto
descrevia um limite de confiança mais estreito do que o real, então quem
o lesse para decidir se podia rodar o CLI num repositório desconhecido
tomaria a decisão com a informação errada. Uma política de segurança que
subestima a própria superfície é a única classe de erro de documentação
que tem consequência de segurança.

A tabela de versões suportadas também seguia congelada em `0.1.x`,
enquanto o projeto publica 0.16.0 — ou seja, não respondia a pergunta que
ela existe para responder.

## What

Três edições em `SECURITY.md`.

O compromisso sobre subprocessos passa a enumerar exatamente os três que
existem: consultas `git` somente-leitura (`cat-file`, `diff`, `log`,
`ls-files`, `merge-base`, `rev-parse`), passadas como array e nunca por
shell; os `checks[].run` de `verify.json`, executados por `verify`; e o
`evidence_runner` do mesmo arquivo, executado por `coverage --run`. O
hook de pre-commit continua nomeado, agora como o que é: um arquivo que o
git roda depois.

Uma seção nova, **The trust boundary: a project's own files**, diz em uma
frase o que faltava: rodar `doctrina verify` dentro de um repositório em
que você não confia executa comandos que aquele repositório escolheu,
como `npm test`. E diz o complemento, que é o que dá valor à ressalva:
nenhum outro comando executa comando declarado pelo projeto.

A classificação de incidentes acompanha. Execução declarada em
`verify.json` sai da lista de incidentes e entra na de comportamento
documentado; entra no lugar a fuga real — um comando que escape dos
checks que declara, ou um artefato malicioso que consiga rodar código por
qualquer outro comando.

## Scope boundaries

Não altera comportamento: nenhuma linha de código muda. Não estreita o
que `verify` executa, o que seria outra decisão, com ADR próprio, e não
uma correção de texto.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Os quatro únicos pontos de spawn do `src/` conferem com a enumeração do texto.
- [x] Todo primeiro argumento passado a `git()` é literal, e `git.js` não usa shell.

## Open questions

Nenhuma.
