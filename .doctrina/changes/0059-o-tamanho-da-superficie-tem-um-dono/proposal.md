# Change 0059-o-tamanho-da-superficie-tem-um-dono — o tamanho da superficie tem um dono

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** docs

## Why

a contagem de comandos operacoes e ADRs esta escrita a mao em quatro arquivos e nenhum bate com o catalogo; o check-docs so verifica comandos e so nos dois READMEs da raiz

## What

O catálogo de comandos é gerado e tem dono único; o tamanho dele é escrito à mão
em quatro lugares, e os quatro discordam do catálogo e entre si:

| Onde | Afirma | Real |
|---|---|---|
| `README.md:92-93` | 38 comandos, 59 operações | 38 ok, 61 errado |
| `README.md:102` | ADRs 0001–0025 | 26 ADRs |
| `docs/en/README.md:82` | 33 comandos, 50 operações | errado |
| `src/lib/usage.js:4` | 36 comandos, 59 operações | errado |

O `check-docs.js` já tem o check 12 para isso — mas só para comandos e só nos
dois READMEs da raiz.

Ou o número sai da prosa e vira ponteiro para `doctrina --help`, ou o check 12
passa a cobrir operações, qualquer arquivo sob `docs/` e a faixa de ADRs. A
primeira opção é mais barata e mais parecida com o resto do projeto; a decisão
fica para a sessão que implementar, com o teste que a sustente. Delta em
`specs/docs`.

## Scope boundaries

- Não conta comentário de código como documentação verificável, mas `usage.js`
  entra na correção: é o módulo cuja função é medir a superfície.
- Não mexe no catálogo nem no bloco de superfície gerado.

## Verification


- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Nenhum arquivo afirma um número da superfície que discorde do catálogo.
- [ ] O que restar afirmando número é verificado por teste, não por revisão.
- [ ] Adicionar um ADR ou uma operação não deixa nenhuma contagem para trás.

## Open questions

- Nenhuma.
