# Change 0145-playbooks-skill-comando-avisam — os playbooks e a skill de comando avisam do changelog antes do close cobrar

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore (confident; signals: changelog)
- **Affects specs:** templates
- **Documented surface:** n/a — nomeia gates e comandos para dizer onde o aviso faltava; nenhum deles muda de comportamento aqui

<!--
Optional, and usually absent. The closing docs gate reads COMMAND and FLAG
names out of the prose below and asks for documentation when it finds any.
It cannot tell a change from a mention: explaining an effect, or writing a
Scope boundaries line about what this deliberately does NOT touch, names
things just as loudly as changing them would.

When that happens, say so on the record instead of forcing the close:

- **Documented surface:** n/a — names two commands to explain an effect; alters neither

`none` reads the same as `n/a`, and a BARE one silences nothing — the
reason is the declaration.
-->

## Why

A change 0135 fez o `close` exigir entrada de changelog para uma mudança de
superfície documentada. A 0139 criou a declaração que responde a um nome
apenas citado. As duas regras existiam no gate.

Em nenhum procedimento que leva até ele.

O playbook de `work` — que é o que um agente executa para toda change de
produto — não menciona nem uma nem outra. A skill `add-cli-command`, cujo
procedimento de sete passos existe justamente para não deixar superfície
para trás, também não: e adicionar um comando é, por definição, mudança de
superfície documentada.

Quem segue o procedimento fielmente bate num gate sobre o qual nunca foi
avisado. Uma regra que só aparece no instante da recusa é uma regra que
custa uma ida e volta toda vez.

Ao ler o passo 7 do playbook, apareceu um segundo defeito. Ele repetia a
sequência de fechamento numa lista própria:

    analyze → change apply → verify → coverage → trace → change archive → validate

Isso é uma segunda cópia de algo que `gates.js` declara e que o próprio
`close` imprime a cada execução — e a cópia já estava defasada em quatro
passos, sem o review, o runtime, o implementation e o docs, além do
index-drift que a change 0143 acrescentou.

## What

O passo 7 do playbook para de repetir a sequência e passa a apontar para
quem a imprime, que é o que não deriva. No lugar entram os gates que pedem
ESCRITA: a documentação, a entrada de changelog, e a declaração para o caso
em que os nomes na prosa são apenas citação.

A skill `add-cli-command` ganha o passo do changelog, numerado entre a
contagem de operações e os gates, e registra nos anti-padrões o episódio
mais recente da lição que ela já ensinava.

O playbook de `chore` não muda, e está certo assim: uma change de chore não
produz sinal de superfície, e os dois gates ficam em silêncio para ela.

**O template empacotado também.** Editar só o override em `.doctrina/`
consertaria este repositório e nenhum outro: pela ADR 0019 a resolução é uma
cadeia, e um projeto adotante recebe o empacotado. Os dois arquivos ficam
idênticos.

## Scope boundaries

Não muda nenhum gate. Os dois já se comportavam assim; o que faltava era o
aviso chegar antes da recusa.

Não reescreve os outros passos do playbook.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O template empacotado e o override do projeto são idênticos.
- [x] Os quatro goldens de playbook foram regravados, e a recaptura está registrada no comentário do teste.

## Open questions

Nenhuma.
