# Change 0250-a-setima-auditoria-fecha-fim-de-linha-conflito-e — a setima auditoria fecha fim de linha conflito e concorrencia

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** structure, core, scaffolding, workspace, authoring


## Why

Sétima auditoria, feita com três instrumentos: o mesmo projeto em LF e em CRLF comparando a saída de cada comando; uma varredura de entradas ruins em todas as 77 operações (3.234 execuções, nenhum stack trace); e os casos de borda do que entrou na véspera. Achados reproduzidos: (1) num checkout CRLF uma spec recém-criada trazia cinco avisos de EARS, o preview do `change check --verbose` mostrava o arquivo inteiro como alterado e cada reescrita deixava linhas LF num arquivo CRLF; (2) o `validate` respondia "0 errors" para uma spec com marcadores de conflito do git; (3) oito `doctrina work` ao mesmo tempo abriram três changes com o número 0003 e um parou num `index.json` escrito pela metade; (4) o `hooks install` quebrava com ENOTDIR num worktree e recusava um projeto em subpasta do repositório, para onde o `doctor` o mandava; (5) `--only` sem valor apagava em silêncio a lista de uma ferramenta estrita; (6) `change renumber 0001-fix` reescrevia uma menção a `0001-fix-login`; (7) o workflow de release publicaria um commit fora da `main`; (8) um projeto Python recebia só o teste no `verify --init`.

## What

- `fs-ops`: `read` devolve LF e `write` devolve ao arquivo o fim de linha que ele tinha; `appendLine`; escrita atômica opcional.
- `conflict-markers`: `validate` dá erro com arquivo e linha; `next` lista primeiro.
- `lock`: número e pasta da change sob uma trava; `index.json` gravado por arquivo temporário e renomeação.
- `hooks install`: pasta de hooks perguntada ao git; projeto em subpasta ganha `cd` no hook; a checagem do índice staged lê o índice do projeto.
- `--only` sem valor é erro de uso; `renumber` troca o id inteiro.
- `release.yml`: recusa execução manual fora da `main` e commit que não está na `main`.
- Intake de Python semeia Ruff e mypy quando declarados.
- Testes, docs EN/PT, skills e CHANGELOG.

## Scope boundaries

Não há trava para todo comando que lê e grava o índice: uma atualização perdida entre dois comandos simultâneos continua possível e o `validate`/`index rebuild` a apontam e curam. Duas branches que alteram a mesma spec ainda conflitam no arquivo da spec, e a versão somada das duas não é recalculada. A spec `authoring` chegou ao limite de 400 linhas e não foi dividida aqui.

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

Nenhuma.

<!-- doctrina:applied-deltas specs/authoring/delta.md=91bb540c,c23fa1ff,e7c38c12 specs/core/delta.md=f9a558bf,e68dc3f8,ecfd730b,10570de7,d90b5a5b specs/scaffolding/delta.md=7006cd36,afc93176,d90b5a5b specs/structure/delta.md=9f1e2df2,43a00d07,7b4e8aa0,d90b5a5b specs/workspace/delta.md=e181a8f8,fc318c27,e7c38c12 -->
