// @ts-check
// The structural gate's checks, as a collection rather than a printout.
//
// `validate` renders these; `doctor` reports them as one row of its
// diagnostic. Before this they were one function inside the command module,
// so the only way for another command to ask "does the tree validate?" was
// to spawn the CLI again and parse its own JSON back — two integration
// styles in one binary, and a "did not produce a report" failure path that
// existed only because of the choice (audit finding F4). ADR 0025: command
// modules render, shared logic lives here.
//
// The one impure part is deliberate: with `fix: true` the collection REPAIRS
// what it can (headers, a drifted index) and returns what it repaired, so the
// caller prints it. A collector that silently wrote files while pretending to
// be a read would be worse than one that says so in its options.
import path from "node:path";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, lineCount, read, relPath, walk, write } from "./fs-ops.js";
import * as idx from "./index-json.js";
import { SCHEMA_VERSION } from "./index-json.js";
import { cliVersion } from "./version.js";
import { today } from "./dates.js";
import { checklistProgress, kindFromPath, nonConformingHeaders, repairHeaders, parseFrontmatter, isPlaceholderHeaderValue } from "./doc-model.js";
import { checkEars, isEarsSpec } from "./ears.js";
import { parseAdrScope, specHeader, listHeader, deriveIndex, indexesMatch, stableStringify } from "./scan.js";
import { COMMAND_NAMES, referencedCommands, DEPRECATED } from "./commands.js";
import { parseAcceptanceCriteria, isVerified } from "./criteria.js";
import { parsePipeline, checkPipeline } from "./pipeline.js";
import { declaredBudget, collectRuntimeFindings } from "./runtime.js";
import { derivedImplementations, implementationMismatch } from "./coverage-model.js";
import { readLedger, ledgerPath as ledgerFile } from "./ledger.js";
import { loadConfig, SOURCES, CONFIG_REL, RULES_REL } from "./config.js";

// AGENTS.md is treated as a maintained doctrina-command catalog only once it
// documents at least this many real commands; below it, the file defers to
// `doctrina --help` and is never nagged about omissions.
const CATALOG_THRESHOLD = 8;

// The shipped ceiling for a project that declares no `agents-md-lines` budget.
// AGENTS.md is loaded into EVERY session, so its size is a tax on all work.
export const AGENTS_MD_SOFT_LIMIT = 150;
export const AGENTS_MD_HARD_MARGIN = 50;

/**
 * The AGENTS.md size budget: what the project declares, what the file spends,
 * and what is left.
 *
 * The ceiling had two homes — a literal here and the `agents-md-lines` row of
 * the contract's Budgets table — which is how every count in this repository
 * has ever drifted (change 0059). The contract is the declaration, so it wins;
 * the literal below is the fallback for a project that declares nothing.
 *
 * @param {string} projectRoot
 * @returns {{ used: number, soft: number, hard: number, slack: number, declared: boolean }}
 */
export function agentsMdBudget(projectRoot) {
  const file = path.join(projectRoot, "AGENTS.md");
  const used = isFile(file) ? lineCount(file) : 0;
  const { value: soft, declared } = declaredBudget(projectRoot, "agents-md-lines", AGENTS_MD_SOFT_LIMIT);
  return { used, soft, hard: soft + AGENTS_MD_HARD_MARGIN, slack: soft - used, declared };
}


/**
 * Run every structural check over the tree.
 *
 * @param {string} projectRoot
 * @param {{fix?: boolean, runtime?: boolean}} [options]
 *   fix — repair what is mechanically repairable before reporting;
 *   runtime — also check the declared runtime surface (ADR 0023).
 * @returns {{errors: string[], warnings: string[], fixes: string[]}}
 */
export function collectValidation(projectRoot, { fix = false, runtime = false } = {}) {
  const fixes = [];
  const errors = [];
  const warnings = [];

  // 1. AGENTS.md
  const agentsMd = path.join(projectRoot, "AGENTS.md");
  if (!isFile(agentsMd)) {
    errors.push("AGENTS.md missing at project root");
  } else {
    const budget = agentsMdBudget(projectRoot);
    const lines = budget.used;
    if (lines > budget.hard) errors.push(`AGENTS.md is ${lines} lines (>${budget.hard}, hard limit)`);
    else if (lines > budget.soft) warnings.push(`AGENTS.md is ${lines} lines (>${budget.soft} soft limit)`);

    // 1c. AGENTS.md command-surface drift. AGENTS.md is the hub the agent reads
    //     first, so the doctrina commands it documents must match the real CLI.
    //     Two drifts are flagged: a reference to a command that does not exist
    //     (a typo or a removed command — the agent will try to run it and fail),
    //     and a maintained catalog that has fallen behind the CLI (commands the
    //     agent never discovers because the hub never names them). validate only
    //     checked AGENTS.md *size* before, so the hub could rot while staying
    //     green; this closes that gap.
    const agentsText = read(agentsMd);
    const referenced = referencedCommands(agentsText);
    const known = new Set(COMMAND_NAMES);
    // Reverse drift is always flagged — a dangling command reference misleads
    // the agent regardless of how the file is structured.
    for (const cmd of [...referenced].sort()) {
      if (!known.has(cmd)) {
        warnings.push(
          `AGENTS.md references \`doctrina ${cmd}\` which is not a CLI command ` +
            `(typo or removed command — agents reading the hub will try to run it)`,
        );
      }
    }
    // Forward drift (omitted commands) is flagged only when the file presents
    // itself as an exhaustive catalog: it documents many commands AND does not
    // defer to `doctrina --help`. A file that defers is declaring its list
    // illustrative (the shipped template does this), so its omissions are
    // intentional and stay silent.
    const documented = [...referenced].filter((cmd) => known.has(cmd));
    const defersToHelp = /doctrina(?:-cli)?\s+--help/.test(agentsText);
    if (documented.length >= CATALOG_THRESHOLD && !defersToHelp) {
      // A DEPRECATED command is absent from the generated block on purpose
      // (change 0049): the block lists what to reach for, and a name that
      // warns when used is not that. Counting it as a gap would make the
      // deprecation permanently red.
      const missing = COMMAND_NAMES.filter((cmd) => !referenced.has(cmd) && !DEPRECATED[cmd]);
      if (missing.length > 0) {
        warnings.push(
          `AGENTS.md documents the doctrina command surface but omits ` +
            `${missing.length} command${missing.length === 1 ? "" : "s"} ` +
            `(${missing.join(", ")}) — agents reading the hub will not discover ` +
            `them (add them, or defer to \`doctrina --help\` for the full list)`,
        );
      }
    }
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

  // Header repair (M3). One grammar means a non-canonical header can be
  // REWRITTEN, not just reported: `- **Status**: x` becomes
  // `- **Status:** x`, and a spec written with list-style headers is
  // normalised to the bare-bold form its kind uses. Content is never
  // touched — only the header's own punctuation and style.
  const doFix = fix;
  {
    const artifacts = [];
    const dot = path.join(projectRoot, ".doctrina");
    for (const f of walk(dot)) {
      if (!f.endsWith(".md")) continue;
      const rel = relPath(projectRoot, f).replace(/\\/g, "/");
      if (rel.includes("/changes/archive/")) continue; // history is immutable
      artifacts.push({ file: f, rel, kind: kindFromPath(rel) });
    }
    let repairedFiles = 0;
    for (const a of artifacts) {
      const text = read(a.file);
      const bad = nonConformingHeaders(text, a.kind);
      if (bad.length === 0) continue;
      if (doFix) {
        const { text: fixed, repaired } = repairHeaders(text, a.kind);
        if (repaired > 0 && fixed !== text) {
          write(a.file, fixed, { force: true });
          repairedFiles += 1;
        }
      } else {
        for (const h of bad) {
          warnings.push(
            `${a.rel}:${h.line} header "${h.name}" is ${h.wrongStyle ? `in ${h.style} style but a ${a.kind} uses ${h.expectedStyle} style` : "not in canonical form"} — run \`doctrina validate --fix\``,
          );
        }
      }
    }
    if (doFix && repairedFiles > 0) {
      fixes.push(`normalised headers in ${repairedFiles} artifact${repairedFiles === 1 ? "" : "s"}`);
    }
  }

  // 3. index.json
  let index = null;
  try {
    index = idx.load(projectRoot);
  } catch (err) {
    errors.push(err.message);
  }

  if (index) {
    // --fix (F5): regenerate the index from the tree before validating, so a
    // drifted index is repaired rather than reported. A full rebuild — it also
    // absorbs orphans and migrates the framework stamp, matching
    // `index rebuild`. Subsequent checks then see the repaired index.
    if (fix) {
      const derived = deriveIndex(projectRoot, index);
      const staleStamp = (index.framework_version ?? null) !== cliVersion();
      if (!indexesMatch(derived, index) || staleStamp) {
        derived.framework_version = cliVersion();
        derived.last_updated = today();
        idx.save(projectRoot, derived);
        fixes.push("rebuilt .doctrina/index.json from the tree");
        index = derived;
      }
    }

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

      // 4b. Index metadata drift (F5 / review G5 / G7). validate is the single
      //     source of truth about whether the project is OK, so an indexed
      //     artifact whose recorded metadata (version, implementation, status,
      //     ...) no longer matches its file is an ERROR here — not a
      //     pass-with-warning that only `index rebuild --check` would catch
      //     (the "validate says OK while next says drift" footgun). Presence
      //     drift (orphan on disk / missing file) stays the orphan warning and
      //     the missing-artifact error above; this targets the metadata that
      //     silently lies. `validate --fix` (above) regenerates instead.
      const derived = deriveIndex(projectRoot, index);
      for (const line of metadataDrift(index, derived)) {
        errors.push(`${line} — run \`doctrina validate --fix\` or \`doctrina index rebuild\``);
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

  // 5d. Scope drift: a spec cites an ADR that does not name it (change 0075).
  //
  //     `Scope:` decides which context packs an ADR loads into. A spec that
  //     CITES an ADR has declared it load-bearing for that capability — so if
  //     the ADR's scope omits the capability, the pack gets it only by
  //     dependency inheritance, and inheritance is the first tier the budget
  //     fitter drops. The ADRs a capability most needs are then the ones it
  //     loses first, silently.
  //
  //     Splitting a spec is what produces this: change 0054 created
  //     `authoring` out of `cli` and left seven cited ADRs pointing at `cli`;
  //     the same drift reached `insight` and `scaffolding` from earlier
  //     splits. Nothing reported it, because nothing compared the two.
  //
  //     A global (unscoped) ADR loads everywhere and is never a violation.
  const specsDirForScope = path.join(projectRoot, ".doctrina", "specs");
  if (isDir(specsDirForScope)) {
    /** @type {Map<string, string[]|null>} */
    const adrScopes = new Map();
    const decisionsDirForScope = path.join(projectRoot, ".doctrina", "decisions");
    if (isDir(decisionsDirForScope)) {
      for (const f of walk(decisionsDirForScope)) {
        const num = /(\d{4})-/.exec(path.basename(f))?.[1];
        if (!num || !f.endsWith(".md")) continue;
        const text = read(f);
        if ((listHeader(text, "Status") ?? "").toLowerCase() !== "accepted") continue;
        const scope = parseAdrScope(text);
        adrScopes.set(num, scope.length > 0 ? scope : null);
      }
    }
    for (const capDir of readdirSync(specsDirForScope, { withFileTypes: true })) {
      if (!capDir.isDirectory()) continue;
      const cap = capDir.name;
      const specFile = path.join(specsDirForScope, cap, "spec.md");
      if (!isFile(specFile)) continue;
      const cited = new Set((read(specFile).match(/ADR (\d{4})/g) ?? []).map((m) => m.slice(4)));
      for (const num of [...cited].sort()) {
        const scope = adrScopes.get(num);
        if (scope === undefined || scope === null) continue; // unknown or global
        if (scope.includes(cap)) continue;
        warnings.push(
          `.doctrina/specs/${cap}/spec.md cites ADR ${num}, but that ADR's Scope: ` +
            `(${scope.join(", ")}) does not name "${cap}" — the pack for ${cap} receives it ` +
            `only by dependency, which is the first thing the context budget drops. ` +
            `Add ${cap} to the ADR's Scope: header, or stop citing it here`,
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

  // 7. Every open change has a proposal, and its delta files carry a
  //    well-formed **Operation:** header. The delta used to be the one
  //    100% hand-authored file with no early check: a missing header passed
  //    silently at creation and exploded days later in the closing analyze
  //    (operator review 2026-07-19 §3.2). Warning-level — the change is
  //    still a draft — but now every `validate` run names it.
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    for (const entry of readdirSync(changesDir)) {
      if (entry === "archive" || entry.startsWith(".")) continue;
      const proposal = path.join(changesDir, entry, "proposal.md");
      if (!isFile(proposal)) {
        errors.push(
          `open change "${entry}" missing proposal.md ` +
            `(every dir under .doctrina/changes/ needs a proposal.md — that exact filename)`,
        );
      }
      // A change whose tasks are still the scaffold placeholders was opened
      // but never planned — the agent is (or will be) implementing with no
      // recorded plan. Early, every-run signal; analyze/close hard-fail it.
      const tasksPath = path.join(changesDir, entry, "tasks.md");
      if (isFile(tasksPath)) {
        const ph = checklistProgress(read(tasksPath)).placeholders;
        if (ph > 0) {
          warnings.push(
            `open change "${entry}" tasks.md still carries ${ph} scaffold placeholder task${ph === 1 ? "" : "s"} — ` +
              `the change was opened but never planned (replace them with real tasks; analyze/close refuse them)`,
          );
        }
      }
      for (const deltaPath of walk(path.join(changesDir, entry, "specs"))) {
        if (!deltaPath.endsWith("delta.md")) continue;
        const text = read(deltaPath);
        const m = text.match(/^\*\*Operation:\*\*\s*(\S+)/m);
        if (!m) {
          warnings.push(
            `${relPath(projectRoot, deltaPath)} has no **Operation:** header — ` +
              `analyze/apply will refuse it at close time (add "**Operation:** ADDED|MODIFIED|REMOVED")`,
          );
        } else if (!["ADDED", "MODIFIED", "REMOVED"].includes(m[1])) {
          warnings.push(
            `${relPath(projectRoot, deltaPath)} Operation "${m[1]}" is not ADDED|MODIFIED|REMOVED — ` +
              `analyze/apply will refuse it at close time`,
          );
        }
      }
    }
  }

  // 8. Specs over 400 lines warn (lost-in-the-middle).
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (isDir(specsDir)) {
    const KNOWN_SPEC_HEADERS = ["Capability", "Status", "Implementation", "Version", "Last updated", "Realizes"];
    // The coverage arithmetic, read once for the whole tree: every spec's
    // Implementation header is checked against it below (8d).
    const derived = derivedImplementations(projectRoot);
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

        // 8b-ii. ORDERED requirements (change 0029). EARS states each
        //     event-driven requirement independently and says nothing about
        //     order, so a consumer step and its producer both pass while the
        //     consumer reads last run's file. A `### Pipeline` block declares
        //     the order and the artifact each step hands on; the invariant is
        //     that a step may only require what an EARLIER step produced.
        //     Opt-in: a spec without the block is never checked.
        for (const f of checkPipeline(parsePipeline(text))) {
          errors.push(`${relPath(projectRoot, specPath)}:${f.line} ${f.message} [${f.code}] — ${f.remedy}`);
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

          // 8d. The same header, checked against the ARITHMETIC rather than
          //     against Status (audit finding F10). Coverage already knows how
          //     many of a spec's criteria cite proof that resolves, which is
          //     what "verified" means — so a header that disagrees with its own
          //     evidence is a warning with the exact op that settles it, not a
          //     field the agent is asked to remember. Never rewritten here: the
          //     gate proposes, a human or `spec set --implementation auto`
          //     applies. A note after the state word silences it, as it does
          //     the coverage gate itself.
          const mismatch = implementationMismatch(implRaw, derived.get(cap)?.derived ?? null);
          if (mismatch) {
            const row = derived.get(cap);
            warnings.push(
              `${relPath(projectRoot, specPath)}: Implementation is "${mismatch.written}" but ` +
                `${row.covered}/${row.total} criteria have resolving proof, which supports ` +
                `"${mismatch.derived}" (apply it with \`doctrina spec set ${cap} --implementation auto\`, ` +
                `or add a note after the value saying why the count is not the whole story)`,
            );
          }
        }

        // 8e. Provenance adoption (review 2026-06-27, §5/§9). `trace` is the
        //     intent→capability link, but it stays inert when nothing forces
        //     the tag, so an active capability with no Realizes: header is an
        //     untraced promise — warn here (validate is always run) rather than
        //     only in the opt-in `trace`. Advisory, with the same escape hatch
        //     pattern as Implementation: any value silences it, including a
        //     deliberate "n/a — <why>" for an internal capability that maps to
        //     no product anchor. Bug specs (off the implementation axis) and
        //     draft/deprecated documents are exempt — only active capability
        //     specs make the promise.
        //     The escape hatch used to arrive PRE-ARMED: the scaffold writes a
        //     placeholder value for Realizes, any value silenced the check, so
        //     in the normal flow this warning was dead code and `trace` was
        //     left to report the intent as dropped, far from the cause. A value
        //     that is still the template's placeholder counts as absent
        //     (change 0057).
        const docStatusForRealizes = (specHeader(text, "Status") ?? "active").toLowerCase();
        const onImplAxis = specHeader(text, "Implementation") !== null;
        const realizesValue = specHeader(text, "Realizes");
        const realizesMissing = isPlaceholderHeaderValue(realizesValue, {
          template: "spec.md.template", name: "Realizes",
        });
        if (docStatusForRealizes === "active" && onImplAxis && realizesMissing) {
          warnings.push(
            `${relPath(projectRoot, specPath)}: active spec ${realizesValue === null ? "has no" : "still carries the scaffold's"} Realizes: header — ` +
              `it traces to no product intent (\`doctrina trace\`). Tag a product.md ` +
              `success-criteria bullet "- [SC1] ..." and add "**Realizes:** SC1", or ` +
              `record "**Realizes:** n/a — <why>" if it maps to no product anchor`,
          );
        }

        // 8g. An acceptance criterion still in the template's placeholder form
        //     (change 0065). `spec new` ships one — "[unverified] <observable
        //     signal> — verified by `path/to/test`" — and nothing reported it.
        //     It survived into an ACTIVE spec and only surfaced days later as
        //     a coverage failure in the close of an unrelated change, because
        //     `path/to/test` resolves nowhere. The same ruler change 0057
        //     applied to headers: a value still wrapped in <...> is a value
        //     nobody wrote.
        for (const crit of parseAcceptanceCriteria(text)) {
          const placeholder = /^\s*\[[^\]]*\]\s*<[^>]*>/.test(crit.body)
            || crit.proofPaths.includes("path/to/test");
          if (!placeholder) continue;
          warnings.push(
            `${relPath(projectRoot, specPath)}: acceptance criterion #${crit.n} is still the ` +
              `scaffold's placeholder — write the observable signal and cite proof that exists, ` +
              `or delete the criterion (it resolves nowhere, so \`coverage\` reports it dangling ` +
              `in the close of whatever change touches this capability next)`,
          );
        }

        // 8d. Metadata-header shape (review G11). In the header block (before
        //     the first `## ` section or `<!--` comment), a known key written
        //     without the canonical `**Key:** value` form silently fails to
        //     parse — the index then falls back to a default and drifts. Warn
        //     with the fix rather than letting the mis-typed header vanish.
        const headerLines = text.split(/\r?\n/);
        for (let i = 0; i < headerLines.length; i++) {
          if (/^\s*(##\s|<!--)/.test(headerLines[i])) break;
          for (const key of KNOWN_SPEC_HEADERS) {
            const attempt = new RegExp(`^\\s*-?\\s*\\**${key}\\**\\s*:`, "i");
            const canonical = new RegExp(`^(?:-\\s+)?\\*\\*${key}:\\*\\*\\s+\\S`);
            if (attempt.test(headerLines[i]) && !canonical.test(headerLines[i])) {
              warnings.push(
                `${relPath(projectRoot, specPath)}:${i + 1} metadata header "${key}" is not in ` +
                  `canonical "**${key}:** value" form — it will not parse (G11)`,
              );
            }
          }
        }

        // 8f. Self-certified acceptance criteria (honest gates, ADR 0008). A
        //     criterion that asserts [verified] but cites no proof path is a
        //     claim with nothing behind it — the dishonest-green case. `coverage`
        //     reports every bare criterion; this names the specific combo
        //     (claims verified, proves nothing) in the always-run gate. It reads
        //     through the shared multi-line parser, so a proof cited on a
        //     continuation line still counts (no false positive).
        for (const crit of parseAcceptanceCriteria(text)) {
          if (isVerified(crit) && crit.proofPaths.length === 0) {
            warnings.push(
              `${relPath(projectRoot, specPath)}: acceptance criterion #${crit.n} is marked ` +
                `[verified] but cites no proof path — self-certified (cite the file/test in ` +
                `backticks, or drop the marker; \`doctrina coverage\`)`,
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
  if (index?.artifacts && isFile(ledgerFile(projectRoot))) {
    // One parse of the ledger grammar, in lib/ledger.js (change 0046). This
    // check used to carry its own regex, so the file's readers and its
    // writers could drift apart with nothing to notice.
    //
    // An abandoned change is ledger-only BY DESIGN: `change abandon` records
    // the discard in history but deletes the folder, so there is deliberately
    // no archive entry to cross-check. Requiring one made every abandonment
    // turn validate permanently red (found dogfooding change
    // 0001-review-followups). A gap line records a waived gate, not a change
    // that landed, so it is not cross-checked either.
    const ledgerIds = new Set(
      readLedger(projectRoot).entries.filter((e) => e.kind === "archived").map((e) => e.id),
    );
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

      // 14b. A skill nothing can TRIGGER is a file, not a memory (change
      //      0029). `context` lists a skill's `when:` so an agent can fire
      //      the right one without loading any of them — but a trigger
      //      written as pure prose ("when it makes sense", "as needed")
      //      gives it nothing to match on, and the skill is never loaded by
      //      anyone who did not already know it existed. A usable trigger
      //      names something concrete: a keyword, a path, a command, an
      //      error string.
      if (whenField && !hasDetectableTrigger(whenField)) {
        warnings.push(
          `${rel} frontmatter "when" has no detectable trigger — name a concrete ` +
          `keyword, path, command or error string, or nothing can match it ` +
          `(got: "${whenField.length > 60 ? `${whenField.slice(0, 59)}…` : whenField}")`,
        );
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

  // 16. Bilingual docs parity. Projects that keep an EN-source docs tree
  //     with a PT mirror (docs/en + docs/pt) get filename-parity checking:
  //     a file added in one language and missing in the other is invisible
  //     to every other gate, and the mirror silently falls behind. Only the
  //     deterministic half (file sets) is checked — content staleness stays
  //     a human judgement. Projects without both trees never see this.
  const docsEn = path.join(projectRoot, "docs", "en");
  const docsPt = path.join(projectRoot, "docs", "pt");
  if (isDir(docsEn) && isDir(docsPt)) {
    const mdSet = (dir) => new Set(readdirSync(dir).filter((f) => f.endsWith(".md")));
    const enSet = mdSet(docsEn);
    const ptSet = mdSet(docsPt);
    for (const f of [...enSet].sort()) {
      if (!ptSet.has(f)) {
        warnings.push(`docs/en/${f} has no docs/pt/${f} counterpart (EN is the source; the PT mirror fell behind)`);
      }
    }
    for (const f of [...ptSet].sort()) {
      if (!enSet.has(f)) {
        warnings.push(`docs/pt/${f} has no docs/en/${f} counterpart (PT translates an EN source, never leads it)`);
      }
    }
  }

  // Project rules — permanent, lintable constraints (.doctrina/rules.json;
  // 0.11.0 field review item 12: "never reference company X" lived only in
  // agent memory, and the remaining mentions sailed through every gate). Each
  // rule is a forbid-regex over glob-scoped paths; a match is an ERROR with
  // the rule's own message. Deterministic, zero-deps, and the instruction
  // survives sessions because it is an artifact, not a memory.
  for (const line of checkProjectRules(projectRoot)) errors.push(line);

  // 18. --runtime folds the RUNTIME gate into the structural one, so a
  //     single call covers both halves of the truth: the shape of the
  //     artifacts, and whether what they declare about the running system
  //     still holds. Opt-in because it reads files outside .doctrina/
  //     (workflows, consumers, test sources) and a structural validate
  //     should stay cheap. Delegates to lib/runtime.js — the same checks
  //     `contract check`, `triage` and `doctor` render, so the four can
  //     never disagree.
  if (runtime) {
    for (const f of collectRuntimeFindings(projectRoot).findings) {
      const line = `${f.contract}: ${f.message} [${f.code}] — ${f.remedy}`;
      if (f.level === "error") errors.push(line);
      else warnings.push(line);
    }
  }

  return { errors, warnings, fixes };
}

// Does a skill's `when:` give anything to MATCH on? A trigger written as
// pure prose ("when it seems relevant", "as needed") reads fine and can
// never fire: `context` ranks skills by comparing the trigger against the
// task, and there is nothing there to compare. A usable trigger names
// something concrete — a path or glob, a command, a quoted error string, a
// file extension, an ALL_CAPS identifier, or simply enough distinctive
// keywords to match on.
const VAGUE_TRIGGER = /^(?:when(?:ever)?\s+)?(?:it|this|you|the agent)?\s*(?:is\s+)?(?:seems?|feels?|looks?)?\s*(?:relevant|appropriate|needed|necessary|useful|applicable|as needed|if needed)\.?$/i;

export function hasDetectableTrigger(when) {
  const text = String(when ?? "").trim();
  if (text === "" || VAGUE_TRIGGER.test(text)) return false;
  // Anything structural is inherently matchable.
  if (/[\/\]|\*|`|"|'|\.\w{2,4}|[A-Z][A-Z0-9_]{2,}/.test(text)) return true;
  // Otherwise: enough distinctive words to rank on. Stopwords do not count.
  const STOP = new Set(["when", "whenever", "the", "a", "an", "is", "are", "you", "your",
    "it", "its", "this", "that", "and", "or", "to", "of", "in", "on", "for", "with",
    "any", "some", "need", "needs", "needed", "should", "must", "at", "as", "by", "be"]);
  const words = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  return words.filter((w) => !STOP.has(w)).length >= 2;
}

// Enforce the project's rules — permanent constraints as forbid-regexes over
// glob-scoped paths:
//   { "rules": [ { "id": "white-label", "forbid": "\\bAcmeCorp\\b",
//                  "paths": ["src/**", ".doctrina/specs/**"],
//                  "message": "white-label product; use a generic placeholder" } ] }
// Declared in .doctrina/config.json; still read from the legacy
// .doctrina/rules.json when that is where a project put them (change 0047).
// Returns error strings (one per offending file+rule, capped per rule so a
// mass violation stays readable). No rules → nothing to enforce; a malformed
// file is reported once, by the reader. Binary-ish and vendored dirs are
// skipped by the same bounded walk validate already uses elsewhere.
const RULES_SKIP_DIRS = new Set([
  ".git", "node_modules", "vendor", "dist", "build", "out", "target",
  ".venv", "venv", "__pycache__", ".next", "coverage",
]);
const RULES_MAX_HITS_PER_RULE = 10;

function checkProjectRules(projectRoot) {
  const cfg = loadConfig(projectRoot);
  const out = [...cfg.errors];
  const where = cfg.sources.rules === SOURCES.config ? CONFIG_REL : RULES_REL;
  const compiled = [];
  for (const r of cfg.rules) {
    if (!r || typeof r.forbid !== "string" || !r.forbid) {
      out.push(`${where}: rule "${r?.id ?? "?"}" needs a non-empty "forbid" regex`);
      continue;
    }
    let re;
    try {
      re = new RegExp(r.forbid, "m");
    } catch (err) {
      out.push(`${where}: rule "${r.id ?? r.forbid}" has an invalid regex: ${err.message}`);
      continue;
    }
    const paths = Array.isArray(r.paths) && r.paths.length ? r.paths : ["**"];
    compiled.push({ id: r.id ?? r.forbid, re, matchers: paths.map(globToRegExp), message: r.message ?? "", hits: 0 });
  }
  if (compiled.length === 0) return out;

  // One bounded walk; each text file is read at most once.
  const stack = [projectRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!RULES_SKIP_DIRS.has(entry.name)) stack.push(full);
        continue;
      }
      const rel = relPath(projectRoot, full).replace(/\\/g, "/");
      if (rel === ".doctrina/rules.json") continue; // the rule text itself always matches
      const applicable = compiled.filter((cr) => cr.hits < RULES_MAX_HITS_PER_RULE && cr.matchers.some((m) => m.test(rel)));
      if (applicable.length === 0) continue;
      let text;
      try {
        text = read(full);
      } catch {
        continue;
      }
      for (const cr of applicable) {
        const m = cr.re.exec(text);
        if (m) {
          cr.hits += 1;
          const lineNo = text.slice(0, m.index).split("\n").length;
          out.push(`rule "${cr.id}": ${rel}:${lineNo} matches forbidden pattern${cr.message ? ` — ${cr.message}` : ""}`);
        }
      }
    }
  }
  for (const cr of compiled) {
    if (cr.hits >= RULES_MAX_HITS_PER_RULE) {
      out.push(`rule "${cr.id}": more matches suppressed after ${RULES_MAX_HITS_PER_RULE} files`);
    }
  }
  return out;
}

// Minimal glob → RegExp: ** crosses directories, * stays within a segment.
// Anchored to the whole repo-relative POSIX path.
function globToRegExp(glob) {
  const esc = String(glob).replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = esc
    .replace(/\*\*\//g, "(?:.*/)?")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${body}$`);
}

// Per-entry metadata drift between the on-disk index and the tree-derived
// one, for entries present in BOTH. Presence drift (an artifact on disk but
// not indexed, or indexed but missing) is left to the orphan warning and the
// missing-artifact error; this isolates the case the review hit — an indexed
// artifact whose recorded metadata no longer matches its file.
function metadataDrift(current, derived) {
  const lines = [];
  // Skills are deliberately excluded: their description has a dedicated
  // reconciliation command (`doctrina skill sync`) and stays an advisory
  // warning (see section 15), not a hard error.
  const cats = ["specs", "decisions", "changes", "changes_archive", "contracts"];
  for (const cat of cats) {
    const cur = new Map((current.artifacts?.[cat] ?? []).map((e) => [e.id, e]));
    const der = new Map((derived.artifacts?.[cat] ?? []).map((e) => [e.id, e]));
    for (const [id, entry] of cur) {
      if (der.has(id) && stableStringify(entry) !== stableStringify(der.get(id))) {
        lines.push(`index.json: ${cat} "${id}" metadata differs from its file`);
      }
    }
  }
  return lines;
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
