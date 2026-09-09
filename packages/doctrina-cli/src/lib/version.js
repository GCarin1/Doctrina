// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// Single source for "which CLI version is running." Read from the package
// manifest so it tracks the published version with no extra wiring. Used to
// stamp index.json (so an artifact tree records the framework that manages
// it — `doctrina validate` warns and `index rebuild` migrates when the stamp
// falls behind the running CLI) and to print `doctrina --version`.

const here = path.dirname(fileURLToPath(import.meta.url));

// Numeric semver comparison ("0.15.10" sorts above "0.15.9"); anything
// that is not X.Y.Z sorts lowest, so a garbage stamp is always migrated.
export function compareVersions(a, b) {
  const parse = (v) => {
    const m = String(v ?? "").match(/^(\d+)\.(\d+)\.(\d+)$/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const pa = parse(a); const pb = parse(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

// The stamp to WRITE: the newer of what the index holds and what runs
// (change 0116). An older CLI rebuilding a newer tree keeps the newer
// stamp; a newer CLI migrates an older one forward. Never rewound.
export function newestVersion(current, running) {
  return compareVersions(current, running) > 0 ? String(current) : String(running);
}

export function cliVersion() {
  // src/lib/version.js -> packages/doctrina-cli/package.json
  const pkgPath = path.resolve(here, "..", "..", "package.json");
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
