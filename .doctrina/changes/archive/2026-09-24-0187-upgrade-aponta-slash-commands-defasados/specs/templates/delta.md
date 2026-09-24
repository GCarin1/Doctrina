# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

O `upgrade` vê o slash command que a versão anterior deixou para trás.

```ops
append-requirement event: When `doctrina upgrade` runs over a project whose installed agent command shim tells the agent to run a deprecated or removed command, the system shall report that shim as a finding naming the command and the rewrite that repairs it (`doctrina adapter add <agent> --force`), and shall exit with the gate class until it is repaired, because a shim is copied once and an upgraded CLI otherwise leaves the agent on the old flow in silence.
append-criterion [verified] A claude shim carrying the 0.16 `analyze` → `change apply` step makes `upgrade` exit 1 naming the file, the deprecated command and `doctrina adapter add claude --force`; running that fix clears it and the upgrade exits 0; `change check` titles its first section `structure` — verified by `packages/doctrina-cli/test/o-upgrade-ve-o-slash-command-defasado.test.js`.
bump-version minor
```
