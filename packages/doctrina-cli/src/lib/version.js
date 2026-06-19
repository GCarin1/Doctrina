import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// Single source for "which CLI version is running." Read from the package
// manifest so it tracks the published version with no extra wiring. Used to
// stamp index.json (so an artifact tree records the framework that manages
// it — `doctrina validate` warns and `index rebuild` migrates when the stamp
// falls behind the running CLI) and to print `doctrina --version`.

const here = path.dirname(fileURLToPath(import.meta.url));

export function cliVersion() {
  // src/lib/version.js -> packages/doctrina-cli/package.json
  const pkgPath = path.resolve(here, "..", "..", "package.json");
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
