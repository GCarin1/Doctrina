// @ts-check
import path from "node:path";
import { read } from "./fs-ops.js";
import { locateTemplatesDir } from "./templates.js";
// Reading a spec delta.
//
// Which capability a delta targets, and whether a spec file is still the
// untouched scaffold, are questions `analyze` and `close` ask as often as
// `change` does — and both used to reach into `commands/change.js` for the
// answer (audit finding F7). Pure text predicates, so they live here.

export function parseOperation(text) {
  const m = text.match(/^\*\*Operation:\*\*\s*([A-Z]+)/m);
  if (!m) return null;
  const op = m[1];
  if (op === "ADDED" || op === "MODIFIED" || op === "REMOVED") return op;
  return null;
}

export function parseCapabilityFromDelta(text, deltaPath) {
  // Prefer the explicit header "# Spec Delta — capability: <name>"
  const m = text.match(/^#\s+Spec Delta\s*[—-]\s*capability:\s*([a-z][a-z0-9-]*)/m);
  if (m) return m[1];
  // Fall back to the parent directory name of the delta file
  const parent = path.basename(path.dirname(deltaPath));
  if (/^[a-z][a-z0-9-]*$/.test(parent)) return parent;
  return null;
}

// Is the on-disk spec still the untouched `spec new <cap>` scaffold? Precise
// check: render the shipped capability template for the same capability and
// compare, ignoring the date-bearing "Last updated" line and whitespace
// normalisation. When the template cannot be located (unusual installs),
// fall back to the scaffold's own placeholder fingerprints — text no real
// spec keeps. Used by `change apply` so an ADDED delta can replace a
// scaffold (the canonical spec-new → delta flow) without ever clobbering a
// spec that carries real content.
export function isUntouchedScaffold(specText, capability) {
  const normalize = (s) =>
    s.replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => !/^\*\*Last updated:\*\*/.test(line))
      .join("\n")
      .trim();
  try {
    const tplPath = path.join(locateTemplatesDir(), "spec.md.template");
    const rendered = read(tplPath)
      .replace(/\{\{CAPABILITY\}\}/g, capability)
      .replace(/\{\{DATE\}\}/g, "");
    if (normalize(rendered) === normalize(specText)) return true;
  } catch {
    // fall through to the fingerprint heuristic
  }
  // Fingerprints: the Purpose placeholder comment AND an empty Ubiquitous
  // section survive only in a scaffold nobody edited.
  return (
    specText.includes("<!-- One paragraph: what this capability does and why it exists. -->") &&
    /##\s+Requirements \(EARS\)[\s\S]*?### Ubiquitous\s*\n\s*-\s*\n/.test(specText)
  );
}
