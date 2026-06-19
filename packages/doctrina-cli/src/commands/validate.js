import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, lineCount, read, relPath, walk } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { SCHEMA_VERSION } from "../lib/index-json.js";
import { cliVersion } from "../lib/version.js";
import { c } from "../lib/colors.js";
import { parseFrontmatter } from "./skill.js";
import { checkEars, isEarsSpec } from "../lib/ears.js";
import { specHeader, listHeader } from "../lib/scan.js";

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  const errors = [];
  const warnings = [];

  // 1. AGENTS.md
  const agentsMd = path.join(projectRoot, "AGENTS.md");
  if (!isFile(agentsMd)) {
    errors.push("AGENTS.md missing at project root");
  } else {
    const lines = lineCount(agentsMd);
    if (lines > 200) errors.push(`AGENTS.md is ${lines} lines (>200, hard limit)`);
    else if (lines > 150) warnings.push(`AGENTS.md is ${lines} lines (>150 soft limit)`);
  }

  // 1b. Nested AGENTS.md files ("nearest wins" hierarchy) obey the same
  //     size caps as the root file.
  for (const nested of findNestedAgentsMd(projectRoot)) {
    const rel = relPath(projectRoot, nested);
    const lines = lineCount(nested);
    if (lines > 200) errors.push(`${rel} is ${lines} lines (>200, hard limit)`);
    else if (lines > 150) warnings.push(`${rel} is ${lines} lines (>150 soft limit)`);
  }

  // 2. product.md
  const productMd = path.join(projectRoot, ".doctrina", "product.md");
  if (!isFile(productMd)) errors.push(".doctrina/product.md missing");

  // 3. index.json
  let index = null;
  try {
    index = idx.load(projectRoot);
  } catch (err) {
    errors.push(err.message);
  }

  if (index) {
    if (index.$schema_version !== SCHEMA_VERSION) {
      warnings.push(`index.json $schema_version is "${index.$schema_version}" (expected "${SCHEMA_VERSION}")`);
    }
    // framework_version stamp divergence (3.6). The index records which CLI
    // manages it; a stamp behind (or absent vs.) the running CLI means the
    // tree may predate the current schema. `index rebuild` migrates it.
    const runningVersion = cliVersion();
    if (!index.framework_version) {
      warnings.push(`index.json has no framework_version (run \`doctrina index rebuild\` to stamp it)`);
    } else if (index.framework_version !== runningVersion) {
      warnings.push(
        `index.json framework_version is "${index.framework_version}" but the running CLI is ` +
          `${runningVersion} (run \`doctrina index rebuild\` to stamp/migrate)`,
      );
    }
    if (!index.artifacts) {
      errors.push("index.json missing artifacts object");
    } else {
      // 4. Every referenced artifact path must exist
      const allArtifactPaths = [];
      if (index.artifacts.product?.path) allArtifactPaths.push(index.artifacts.product.path);
      for (const s of index.artifacts.specs ?? []) allArtifactPaths.push(s.path);
      for (const d of index.artifacts.decisions ?? []) allArtifactPaths.push(d.path);
      for (const ch of index.artifacts.changes ?? []) allArtifactPaths.push(ch.path);
      for (const ch of index.artifacts.changes_archive ?? []) allArtifactPaths.push(ch.path);
      for (const ct of index.artifacts.contracts ?? []) allArtifactPaths.push(ct.path);
      for (const rel of allArtifactPaths) {
        const full = path.join(projectRoot, rel);
        if (!exists(full)) errors.push(`index.json references missing artifact: ${rel}`);
      }

      // 4b. Spec version drift — the Version: header inside each spec
      //     must match the version recorded in index.json.
      for (const s of index.artifacts.specs ?? []) {
        const full = path.join(projectRoot, s.path);
        if (!isFile(full)) continue;
        const m = read(full).match(/^(?:-\s+)?\*\*Version:\*\*\s+(\S+)/m);
        if (m && s.version && m[1] !== s.version) {
          warnings.push(`${s.path} declares version ${m[1]} but index.json records ${s.version} (sync the index)`);
        }
      }
    }
  }

  // 5. ADRs have parseable Status: header
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  // Track which files claim each NNNN so a merge-time collision (two branches
  // both allocating the same number) becomes a loud error rather than one ADR
  // silently shadowing the other (C2).
  const adrByNumber = new Map();
  if (isDir(adrDir)) {
    for (const f of walk(adrDir)) {
      if (!f.endsWith(".md")) continue;
      const base = path.basename(f);
      const numMatch = base.match(/^(\d{4})-/);
      const num = numMatch ? numMatch[1] : null;
      if (num) {
        if (!adrByNumber.has(num)) adrByNumber.set(num, []);
        adrByNumber.get(num).push(relPath(projectRoot, f));
      }
      // ADR filenames must be NNNN-slug.md (four digits). The entire ADR
      // toolchain — decision new/accept/supersede, index derivation, and
      // the orphan check below — keys off this shape; a file like
      // "ADR-001-foo.md" is silently invisible to all of them.
      if (base !== "README.md" && !/^\d{4}-.+\.md$/.test(base)) {
        errors.push(
          `${relPath(projectRoot, f)} has a non-canonical ADR filename ` +
            `(expected four digits + slug, e.g. "0001-jwt-algorithm.md"; ` +
            `the decision and index commands silently ignore other shapes)`,
        );
      }
      const text = read(f);
      if (!/^-\s+\*\*Status:\*\*\s+\S+/m.test(text)) {
        errors.push(
          `${relPath(projectRoot, f)} missing or malformed Status: header ` +
            `(expected a Markdown list item exactly like "- **Status:** accepted")`,
        );
      }

      // 5b. ADR evidence drift. A decision is only true if reality reflects
      //     it; an accepted ADR that points at nothing — or at a file that
      //     no longer exists — is the classic "ADR decrees X, the code
      //     never did X". Two header fields anchor a decision to reality:
      //     **Evidence:** (cited at any point) and **Landed:** (the
      //     non-mutating "this is now implemented and verified here" stamp,
      //     written by `doctrina decision land`; 3.4). Both are checked for
      //     dangling citations; an accepted ADR is only flagged bare when
      //     BOTH are empty. ADRs that adopt neither header opt out entirely.
      const evidence = listHeader(text, "Evidence");
      const landed = listHeader(text, "Landed");
      const isBare = (v) => {
        const t = (v ?? "").trim();
        return t === "" || t === "—" || t === "-";
      };
      for (const [field, value] of [["Evidence", evidence], ["Landed", landed]]) {
        if (value === null || isBare(value)) continue;
        for (const token of extractBacktickPaths(value)) {
          const candidates = [path.resolve(path.dirname(f), token), path.resolve(projectRoot, token)];
          if (!candidates.some(exists)) {
            warnings.push(
              `${relPath(projectRoot, f)}: ${field} cites \`${token}\` which is missing on disk — ` +
                `the decision may have drifted from the code (update it or supersede the ADR)`,
            );
          }
        }
      }
      const adrStatus = (listHeader(text, "Status") ?? "").toLowerCase();
      if (adrStatus === "accepted" && evidence !== null && isBare(evidence) && isBare(landed)) {
        warnings.push(
          `${relPath(projectRoot, f)}: accepted ADR cites no implementation evidence ` +
            `(link the file(s) that prove it, run \`doctrina decision land ${num ?? "NNNN"}\` once ` +
            `it ships, or note "n/a — <why>"); a decision with nothing behind it may be drift ` +
            `waiting to be superseded`,
        );
      }
    }

    // 5c. Duplicate ADR numbers (C2).
    for (const [num, files] of adrByNumber) {
      if (files.length > 1) {
        errors.push(
          `ADR number ${num} is claimed by ${files.length} files (${files.join(", ")}) — ` +
            `two branches likely allocated it concurrently; renumber all but one ` +
            `(the index keys decisions by number, so duplicates silently shadow each other)`,
        );
      }
    }
  }

  // 6. Adapter templates under 30 lines
  const adaptersDir = path.join(projectRoot, ".doctrina", "templates", "adapters");
  if (isDir(adaptersDir)) {
    for (const f of walk(adaptersDir)) {
      if (!f.endsWith(".template")) continue;
      const lines = lineCount(f);
      if (lines > 30) errors.push(`${relPath(projectRoot, f)} is ${lines} lines (>30, adapter cap)`);
    }
  }

  // 7. Every open change has a proposal
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    const { readdirSync } = await import("node:fs");
    for (const entry of readdirSync(changesDir)) {
      if (entry === "archive" || entry.startsWith(".")) continue;
      const proposal = path.join(changesDir, entry, "proposal.md");
      if (!isFile(proposal)) {
        errors.push(
          `open change "${entry}" missing proposal.md ` +
            `(every dir under .doctrina/changes/ needs a proposal.md — that exact filename)`,
        );
      }
    }
  }

  // 8. Specs over 400 lines warn (lost-in-the-middle).
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (isDir(specsDir)) {
    const { readdirSync } = await import("node:fs");
    for (const cap of readdirSync(specsDir)) {
      const specPath = path.join(specsDir, cap, "spec.md");
      if (isFile(specPath)) {
        const lines = lineCount(specPath);
        if (lines > 400) warnings.push(`${relPath(projectRoot, specPath)} is ${lines} lines (>400 soft cap)`);

        // 8b. EARS grammar shape — section-appropriate When/While/Where/shall.
        const text = read(specPath);
        if (isEarsSpec(text)) {
          for (const f of checkEars(text)) {
            warnings.push(`${relPath(projectRoot, specPath)}:${f.line} ${f.message}`);
          }
        }

        // 8c. Capability-state honesty (two-axis status). An "active"
        //     document that records no built capability is an inventory
        //     claim — the gap the framework is meant to make visible.
        //     Warn when Status is active and Implementation is "planned"
        //     with no explanatory note after the state word. A note
        //     ("planned — deferred, see ADR 0007") is the deliberate-gap
        //     escape hatch. Specs with no Implementation header are off
        //     the axis and never warn.
        const implRaw = specHeader(text, "Implementation");
        if (implRaw) {
          const docStatus = (specHeader(text, "Status") ?? "active").toLowerCase();
          const implTokens = implRaw.trim().split(/\s+/);
          const implWord = (implTokens[0] ?? "").replace(/[—-]+$/, "").toLowerCase();
          const hasNote = implTokens.length > 1;
          if (docStatus === "active" && implWord === "planned" && !hasNote) {
            warnings.push(
              `${relPath(projectRoot, specPath)}: Status is "active" but Implementation is ` +
                `"planned" with no note — an active spec with no built capability is an ` +
                `inventory claim (advance Implementation, set Status: draft, or add a note ` +
                `after the value: "planned — <why deferred>")`,
            );
          }
        }
      }
    }
  }

  // 9. ADRs over 300 lines warn.
  if (isDir(adrDir)) {
    for (const f of walk(adrDir)) {
      if (!f.endsWith(".md")) continue;
      const lines = lineCount(f);
      if (lines > 300) warnings.push(`${relPath(projectRoot, f)} is ${lines} lines (>300 soft cap)`);
    }
  }

  // 10b. Stale-reference detection — Markdown link targets inside specs
  //      and ADRs that no longer exist on disk. Backtick paths are NOT
  //      checked (descriptive prose, too noisy). Links are pointers.
  for (const dir of [specsDir, adrDir]) {
    if (!isDir(dir)) continue;
    for (const f of walk(dir)) {
      if (!f.endsWith(".md")) continue;
      const text = read(f);
      const fileDir = path.dirname(f);
      for (const ref of extractPathReferences(text)) {
        // Try relative to the file first, then to project root
        const candidates = [
          path.resolve(fileDir, ref),
          path.resolve(projectRoot, ref),
        ];
        if (!candidates.some(exists)) {
          warnings.push(`${relPath(projectRoot, f)} references missing path \`${ref}\``);
        }
      }
    }
  }

  // 10. Orphan detection — files on disk not referenced in index.json.
  if (index?.artifacts) {
    const indexedSpecIds = new Set((index.artifacts.specs ?? []).map((s) => s.id ?? s.capability));
    if (isDir(specsDir)) {
      const { readdirSync } = await import("node:fs");
      for (const cap of readdirSync(specsDir)) {
        const specPath = path.join(specsDir, cap, "spec.md");
        if (isFile(specPath) && !indexedSpecIds.has(cap)) {
          warnings.push(`orphan spec ${relPath(projectRoot, specPath)} (capability "${cap}" not in index.json)`);
        }
      }
    }
    const indexedAdrIds = new Set((index.artifacts.decisions ?? []).map((d) => d.id));
    if (isDir(adrDir)) {
      for (const f of walk(adrDir)) {
        if (!f.endsWith(".md")) continue;
        const m = path.basename(f).match(/^(\d{4})-/);
        if (m && !indexedAdrIds.has(m[1])) {
          warnings.push(`orphan ADR ${relPath(projectRoot, f)} (id "${m[1]}" not in index.json)`);
        }
      }
    }
    const indexedContractIds = new Set((index.artifacts.contracts ?? []).map((ct) => ct.id));
    const contractsDir = path.join(projectRoot, ".doctrina", "contracts");
    if (isDir(contractsDir)) {
      for (const f of walk(contractsDir)) {
        if (!f.endsWith(".md")) continue;
        const id = path.basename(f, ".md");
        if (!indexedContractIds.has(id)) {
          warnings.push(`orphan contract ${relPath(projectRoot, f)} (id "${id}" not in index.json)`);
        }
      }
    }
  }

  // 11. Archive ledger ↔ index cross-check. The history of archived
  //     changes is recorded twice — once human-facing in
  //     changes/archive/LEDGER.md, once machine-facing in
  //     index.json.changes_archive. Two sources of truth that silently
  //     disagree are worse than one: an incomplete ledger makes the
  //     history look shorter than it is. When the ledger exists, every
  //     archived change must appear in both, or validation fails.
  const ledgerPath = path.join(changesDir, "archive", "LEDGER.md");
  if (index?.artifacts && isFile(ledgerPath)) {
    const ledgerIds = new Set();
    for (const line of read(ledgerPath).split(/\r?\n/)) {
      const m = line.match(/^-\s+\d{4}-\d{2}-\d{2}\s+[—-]\s+(\S+)\s+[—-]\s+/);
      if (m) ledgerIds.add(m[1]);
    }
    const archiveIds = new Set((index.artifacts.changes_archive ?? []).map((ch) => ch.id));
    for (const id of archiveIds) {
      if (!ledgerIds.has(id)) {
        errors.push(`archived change "${id}" is in index.json but missing from changes/archive/LEDGER.md (ledger and index disagree)`);
      }
    }
    for (const id of ledgerIds) {
      if (!archiveIds.has(id)) {
        errors.push(`changes/archive/LEDGER.md lists "${id}" but index.json.changes_archive does not (ledger and index disagree)`);
      }
    }
  }

  // 12-14. Skills validation
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (isDir(skillsDir)) {
    for (const f of walk(skillsDir)) {
      if (!f.endsWith(".md")) continue;
      const text = read(f);
      const rel = relPath(projectRoot, f);
      const baseName = path.basename(f, ".md");
      const nameField = parseFrontmatter(text, "name");
      const descField = parseFrontmatter(text, "description");
      const whenField = parseFrontmatter(text, "when");
      if (!nameField) warnings.push(`${rel} missing required frontmatter field "name"`);
      if (!descField) warnings.push(`${rel} missing required frontmatter field "description"`);
      if (!whenField) warnings.push(`${rel} missing required frontmatter field "when"`);
      if (nameField && nameField !== baseName) {
        warnings.push(`${rel} name "${nameField}" does not match filename slug "${baseName}"`);
      }
      const lines = lineCount(f);
      if (lines > 200) warnings.push(`${rel} is ${lines} lines (>200 soft cap)`);
      else if (lines > 150) warnings.push(`${rel} is ${lines} lines (>150 soft cap)`);

      // 15. Skill description drift — index.json must mirror the
      //     frontmatter description (run `doctrina skill sync`).
      if (descField && index?.artifacts?.skills) {
        const entry = index.artifacts.skills.find((s) => s.id === baseName);
        if (entry && entry.description !== descField) {
          warnings.push(`${rel} description differs from index.json (run \`doctrina skill sync\`)`);
        }
      }
    }
  }

  // Output
  for (const w of warnings) console.log(c.yellow("warn:  ") + w);
  for (const e of errors) console.log(c.red("error: ") + e);

  console.log("");
  if (errors.length === 0 && warnings.length === 0) {
    console.log(c.green("ok") + " all validation checks passed");
  } else {
    const summary = `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;
    console.log((errors.length === 0 ? c.green("ok") : c.red("fail")) + " " + summary);
  }
  return errors.length === 0 ? 0 : 1;
}

// Find AGENTS.md files below the root (the "nearest AGENTS.md wins"
// hierarchy). Bounded walk: dependency, build, and VCS directories are
// skipped so validate stays fast on large repositories.
const NESTED_SKIP_DIRS = new Set([
  ".git", "node_modules", ".doctrina", "vendor", "dist", "build", "out",
  "target", ".venv", "venv", "__pycache__", ".next", "coverage",
]);

function findNestedAgentsMd(projectRoot) {
  const found = [];
  const stack = readdirSync(projectRoot)
    .filter((e) => !NESTED_SKIP_DIRS.has(e) && !e.startsWith("."))
    .map((e) => path.join(projectRoot, e))
    .filter(isDir);
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (isDir(full)) {
        if (!NESTED_SKIP_DIRS.has(entry) && !entry.startsWith(".")) stack.push(full);
      } else if (entry === "AGENTS.md") {
        found.push(full);
      }
    }
  }
  return found.sort();
}

// Extract candidate file path references from Markdown text. Only
// Markdown link targets `[text](path)` are checked — backtick spans
// are descriptive prose and produce too many false positives.
function extractPathReferences(text) {
  const out = new Set();
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const token = m[1].trim();
    if (isLikelyPath(token)) out.add(stripFragment(token));
  }
  return [...out];
}

// Path-like tokens inside backtick spans — the convention for citing
// evidence (ADR **Evidence:**, acceptance-criteria links).
function extractBacktickPaths(text) {
  const out = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const token = m[1].trim();
    if (isLikelyPath(token)) out.add(stripFragment(token));
  }
  return [...out];
}

function stripFragment(s) {
  // Remove an in-page anchor (#section) or query string from a path token.
  return s.split(/[#?]/)[0];
}

function isLikelyPath(s) {
  if (!s) return false;
  if (/^(https?:|mailto:|ftp:|#|@)/i.test(s)) return false;
  if (s.includes("{{") || s.includes("}}")) return false;
  if (s.includes("*") || s.includes("?")) return false;
  if (s.includes("<") || s.includes(">")) return false;
  if (s.includes(" ") || s.includes("`")) return false;
  // Strip in-page anchor or query string before further checks
  const head = stripFragment(s);
  if (!head) return false;
  // Folder references (path ending with /) are skipped: not file targets
  if (head.endsWith("/")) return false;
  // Must look like a file path: contains a slash or has a file extension
  const hasSlash = head.includes("/");
  const hasExt = /\.[a-z0-9]{1,8}$/i.test(head);
  if (!hasSlash && !hasExt) return false;
  if (head.startsWith("-")) return false;
  return true;
}

export const help = `
Usage: doctrina validate

Run schema, artifact-existence, and structural checks against the
.doctrina/ tree in the current working directory. Exits 0 if no errors
(warnings allowed), 1 otherwise.
`;
