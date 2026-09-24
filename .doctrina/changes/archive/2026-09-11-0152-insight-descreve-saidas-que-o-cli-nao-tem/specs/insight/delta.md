# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

Dois requisitos descrevem um CLI que não existe mais e que a spec `cli`
contradiz. A spec é a verdade corrente: o texto passa a dizer o que o
comando faz, e a dizer de onde a regra vem, para não voltar a envelhecer
sozinho.

```ops
replace-requirement event 8: When `doctrina search <term> [...]` runs, the system shall report lines where every term matches case-insensitively, grouped by artifact category (specs, decisions, changes, skills, product, AGENTS.md) and ranked best-first within each category (heading, metadata-header, full-phrase, and filename matches score higher), excluding the change archive unless `--archive` is supplied. Finding nothing is not failing: a search with no match says so and exits successfully, like every other view. The command is strictly read-only.
replace-requirement event 9: When `doctrina show <ref>` runs, the system shall resolve `<cap>-R<n>` to the nth requirement bullet of that spec (file order, printed with its EARS section name), `<cap>-C<n>` to the acceptance criterion carrying that explicit number (with its cited evidence), a four-digit number to the matching ADR, and a bare capability name to the spec's header block plus Purpose — read-only, answering a reference it cannot resolve with the usage class, as every command that takes a reference does.
append-criterion [verified] A search with no match and a reference that does not resolve each cost the class the CLI-wide contract gives them, so this spec and the `cli` spec cannot describe two different commands — verified by `packages/doctrina-cli/test/a-spec-descreve-o-cli-que-existe.test.js`.
bump-version minor
```
