import path from "node:path";
import { isDir, read, walk } from "./fs-ops.js";
import { listHeader } from "./scan.js";

// Deterministic ADR checkpoint (operator review 2026-07-19 §4.6). The work
// playbook's "record an ADR" step was ignorable in silence: a change that
// flexibilised an accepted ADR closed with no amendment and nothing barked.
// This helper names the accepted ADRs whose text cites any of the change's
// touched capabilities, so `change check` and `close` can print a loud,
// advisory reminder: if the change alters what the ADR decided, record it
// (`decision supersede` / `decision new`) instead of drifting past it.
// A word match on capability names — a hint, never a decision (ADR 0005),
// and never a blocker (an ADR merely MENTIONING a capability is normal).
export function adrAdvisories(projectRoot, capabilities) {
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  if (!isDir(adrDir) || capabilities.length === 0) return [];
  const out = [];
  for (const f of walk(adrDir)) {
    const base = path.basename(f);
    const m = base.match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(f);
    if ((listHeader(text, "Status") ?? "").toLowerCase() !== "accepted") continue;
    const caps = capabilities.filter((cap) =>
      new RegExp(`(^|[^a-z0-9-])${cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9-]|$)`, "im").test(text),
    );
    if (caps.length === 0) continue;
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    out.push({ id: m[1], title: titleMatch ? titleMatch[1].trim() : base, caps });
  }
  return out;
}

// Print the advisory block shared by `change check` and `close`. Returns the
// number of ADRs flagged (informational; callers never gate on it).
export function printAdrCheckpoint(projectRoot, capabilities, { c }) {
  const hits = adrAdvisories(projectRoot, capabilities);
  if (hits.length === 0) return 0;
  console.log(c.yellow("ADR checkpoint") + c.gray(" — accepted ADRs cite the touched capabilities:"));
  for (const h of hits) {
    console.log(`    ADR ${c.cyan(h.id)}  ${h.title}  ${c.gray(`(cites: ${h.caps.join(", ")})`)}`);
  }
  console.log(c.gray("    If this change alters what an ADR decided, record it now:"));
  console.log(c.gray("    ") + c.cyan("doctrina decision supersede <n>") + c.gray(" · ") + c.cyan("doctrina decision new \"<title>\""));
  return hits.length;
}
