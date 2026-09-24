# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

O guarda de documentação lê toda página de instrução, não só `docs/`.

```ops
append-requirement ubiquitous: The system shall hold every page a person or an agent reads for instructions — the READMEs, `CONTRIBUTING.md`, `AGENTS.md`, `docs/`, `.github/`, the skills, `product.md`, the scaffolding templates, the installed slash commands and the example projects — to the rule that no page teaches a deprecated or removed command outside the lines that retire it, shall keep the contributor pages describing the workflow the repository runs (closing each change with `doctrina close`, the archive as its history), and shall allow an `AGENTS.md` only at the root and in the example projects.
append-criterion [verified] The guard reads CONTRIBUTING.md, the PR template, product.md, the skills, the templates and the example projects; a page outside `docs/` that teaches `doctrina analyze` fails it, the contributor pages name `doctrina close` and never say the archive must stay empty, and an `AGENTS.md` under `packages/doctrina-cli/` fails it — verified by `packages/doctrina-cli/test/a-documentacao-acompanha-o-catalogo.test.js`.
bump-version minor
```
