# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

O que um adapter instala ensina o mesmo fechamento que o playbook.

```ops
append-requirement unwanted: The system shall not install an adapter file that hands the agent `doctrina analyze`, `doctrina change apply` or `doctrina change archive` as manual steps; the work commands an adapter installs shall preview with `doctrina change check <id>` and finish with `doctrina close <id>`, the one definition of done.
append-criterion [verified] With every adapter installed, no installed file names a manual analyze, apply or archive, and each `/doctrina-work` command previews with `change check` and finishes with `close` — verified by `packages/doctrina-cli/test/os-slash-commands-fecham-pelo-close.test.js`.
bump-version minor
```
