# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

A change id names a directory, so it gets the grammar every other authoring
argument already had. `change new` was the only one without: it joined the
string it was given onto a path, so `change new ../../../elsewhere/evil`
wrote the change folder outside the project — against this spec's own
"shall not write outside the project working directory" — and
`0003-with space` was accepted here and then carried by `validate`,
`index rebuild` and `next` as a legitimate id whose remediation line
no one can run.

Two mechanisms, deliberately separate. The grammar is what tells the author
their id is wrong, with the usage class and no writes. The containment
check is what holds when a caller forgets to ask, and it is the direct
enforcement of the requirement rather than a proxy for it.

```ops
append-requirement event: When `doctrina change new <id>` runs with an id that is not lowercase letters, digits and hyphens opening on a letter or a digit, the system shall report a usage error and create nothing.
append-requirement unwanted: The system shall not resolve an artifact path that escapes the project working directory, whatever the shape of the identifier that produced it.
append-criterion [verified] A traversing change id is refused and nothing appears beside the project — verified by `packages/doctrina-cli/test/change-id.test.js`.
append-criterion [verified] An id carrying a space, an uppercase letter or a leading hyphen leaves no folder in the tree — verified by `packages/doctrina-cli/test/change-id.test.js`.
append-criterion [verified] The id shape `work` derives is still accepted, and the change grammar stays distinct from the stricter capability one — verified by `packages/doctrina-cli/test/change-id.test.js`.
bump-version minor
```
