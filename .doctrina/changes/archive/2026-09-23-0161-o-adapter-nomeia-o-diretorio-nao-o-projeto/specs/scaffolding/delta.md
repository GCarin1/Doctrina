# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

---

O nome do projeto é registrado uma vez e lido de um lugar só. Quem escreve
para o agente estava lendo a pasta.

```ops
append-requirement ubiquitous: The system shall substitute a project's recorded name into every file it scaffolds for an agent, falling back to the working directory's name only for a tree that recorded none, so that two commands writing from the same templates cannot introduce two different projects.
append-criterion [verified] Adding an adapter after `init` writes the recorded name rather than the directory's, both installation paths agree, and no module resolves the name on its own — verified by `packages/doctrina-cli/test/o-projeto-tem-um-nome-so.test.js`.
bump-version minor
```
