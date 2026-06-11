# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.1.x` | yes      |
| `< 0.1` | no       |

Older versions do not exist; Doctrina starts at 0.1.0.

## Posture and commitments

The following are properties Doctrina maintains by design. They
are stated as policy so that any deviation is a bug worth
reporting.

- **Zero runtime dependencies.** The CLI imports only Node.js
  standard library modules. The `dependencies` field of every
  published `package.json` is absent or empty. Any PR that adds
  a runtime dependency requires an ADR and a separate review
  pass.
- **No network calls.** The CLI does not make HTTP requests, does
  not resolve DNS, does not contact any remote service at run
  time. Templates are loaded from local disk only.
- **No telemetry, no analytics, no fingerprinting.** Doctrina
  does not collect usage, errors, install counts, machine
  identifiers, or any other signal. No metric leaves your
  machine.
- **Filesystem boundary.** The CLI writes only inside the current
  working directory and (for `hooks install`) inside
  `.git/hooks/`. It does not modify files outside the project
  tree.
- **No process spawning beyond declared commands.** The CLI does
  not invoke subprocesses except the pre-commit hook it
  installs at the user's request.
  
## What counts as a security issue

- A path the CLI writes outside the project working directory.
- A path the CLI reads outside the project working directory or
  the package's installed templates.
- An accidental network call.
- Information leakage in error messages (paths, file contents,
  user identifiers).
- Any path by which an attacker controlling a malicious template
  or change folder could cause the CLI to execute arbitrary code
  beyond the documented hook installation flow.

The following are **not** security issues for Doctrina:

- The pre-commit hook running `doctrina validate` and blocking a
  commit. That is the documented behaviour.
- Templates pointing to project-relative paths that the user can
  rename. The user is the trust boundary for their own project.
- Slow validation on extremely large repositories. Performance is
  a quality concern, not a security concern.

## Out of scope

Doctrina ships no server, no SaaS, no hosted service. There is no
infrastructure to attack. Security reports about a "doctrina.com"
or similar are about a project that is not this one.
