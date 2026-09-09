# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

Four read-only commands rendered the same three collections and imported the
collectors out of each other's modules. This delta states the property that
replaces that arrangement — one collection, several renderings — and the
boundary that keeps it: a command module is a renderer, never a data source
for another command.

```ops
append-requirement ubiquitous: The system shall collect the project's read-only state once per invocation and render every read-only view from that one collection, so no two views can report different numbers for the same tree.
append-requirement ubiquitous: The system shall keep a command module free of any binding imported from another command module, and shall keep its libraries free of any dependency on a command module.
append-requirement event: When a read-only view is requested by name, the system shall render it from the shared collection, refuse an unknown name with the usage exit code and the names that exist rather than defaulting silently, and emit the same machine-readable envelope whichever view was named.
append-criterion [verified] No command module imports a binding out of a sibling command module, and no library module depends on a command module — verified by `packages/doctrina-cli/test/one-collector.test.js`.
append-criterion [verified] Every view is a pure function of the snapshot, and each renders byte-identical output whether reached by its own command or by the view flag — verified by `packages/doctrina-cli/test/one-collector.test.js`.
append-criterion [verified] An unknown view name exits with the usage code naming the nearest real one, and the machine-readable envelope keeps its shape whichever view is asked for — verified by `packages/doctrina-cli/test/one-collector.test.js`.
bump-version minor
```
