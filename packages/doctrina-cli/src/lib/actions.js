// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, relPath, walk } from "./fs-ops.js";
import * as idx from "./index-json.js";
import { deriveIndex, indexesMatch, listHeader, specHeader } from "./scan.js";
import { collectRuntimeFindings } from "./runtime.js";
import { FIX_SHAPED } from "./lexicon.js";
import { summarize as coverageSummary } from "./coverage-model.js";
import { summarize as traceSummary } from "./trace-model.js";

// What comes next, as DATA (change 0032).
//
// This used to live in `commands/next.js` and return strings: the CLI
// assembled `"doctrina change archive 0031 — applied but not archived"`
// character by character, and then handed the agent a sentence to
// re-interpret in order to re-issue the command it had just built. Even
// `--json` returned that same prose inside quotes. Every other part of the
// framework exists to keep a machine from having to read English; this was
// the one place the deterministic chain leaked back into it.
//
// So an action is a record. `text` is the human rendering, built HERE from
// the same fields, so the sentence and the structure can never disagree —
// one builder owns both. A machine branches on `command`/`args`; a person
// reads `text`; `next --run` executes the first `runnable` one.

/**
 * @typedef {object} Action
 * @property {string} id        Stable slug for the KIND of action, not the instance.
 * @property {string|null} command  The doctrina operation ("change archive"), or null
 *                                  when the next step is authorship, not a command.
 * @property {string[]} args
 * @property {string} why       One line: why this is next.
 * @property {string|null} gate The gate this action clears, when it clears one.
 * @property {"blocking"|"advisory"} severity
 * @property {boolean} runnable Whether `next --run` may execute it unattended.
 * @property {string} text      The rendered line. Derived from the fields above.
 */

/**
 * Build one action. `text` is derived unless the line needs a shape the
 * default does not cover (a command embedded mid-sentence, a placeholder
 * argument the caller must fill in).
 *
 * `runnable` defaults to FALSE and is opted into deliberately. An action is
 * runnable only when running it unattended is both safe and the whole of
 * what the action asks for. Anything that needs a human to DECIDE —
 * accepting an ADR, writing a proposal, capturing a skill, ticking a box —
 * is not runnable however mechanical the edit would be, because the edit is
 * not the work.
 *
 * @param {Partial<Action> & { id: string, why: string }} spec
 * @returns {Action}
 */
export function action(spec) {
  const command = spec.command ?? null;
  const args = spec.args ?? [];
  return {
    id: spec.id,
    command,
    args,
    why: spec.why,
    gate: spec.gate ?? null,
    severity: spec.severity ?? "blocking",
    runnable: spec.runnable ?? false,
    text: spec.text ?? defaultText(command, args, spec.why),
  };
}

/** The invocation a person would type, or null when there is no command. */
export function invocation(a) {
  if (!a.command) return null;
  return `doctrina ${[a.command, ...a.args].join(" ")}`;
}

function defaultText(command, args, why) {
  const cmd = command ? `doctrina ${[command, ...args].join(" ")}` : null;
  return cmd ? `${cmd} — ${why}` : why;
}

/**
 * The priority-ordered action list. Shared by `next`, `prime`, `handoff`
 * and `watch`.
 *
 * `gates` is the already-collected gate state, passed in by `snapshot.js`
 * so the whole read costs one collection (change 0037). Omitted — as `next`
 * omits it — the collectors run here instead; the answer is the same either
 * way, which is the point.
 *
 * @param {string} projectRoot
 * @param {{ coverage?: any, trace?: any, verify?: any }} [gates]
 * @returns {Action[]}
 */
export function computeActions(projectRoot, gates = {}) {
  /** @type {Action[]} */
  const actions = [];

  // RUNTIME FIRST (change 0029). A declared wiring that does not hold is
  // not a queue item — it is the reason the last run lied. After a job goes
  // green having executed nothing, "open a change on the observability
  // capability" sends the agent to polish the Markdown of an empty-state
  // message while the cause sits in a file no other action names. A broken
  // declaration outranks every artifact chore below it.
  try {
    const runtime = collectRuntimeFindings(projectRoot);
    const errs = runtime.findings.filter((f) => f.level === "error");
    if (errs.length > 0) {
      actions.push(action({
        id: "runtime-declarations",
        command: "triage",
        gate: "runtime",
        runnable: true,
        why:
          `${errs.length} runtime declaration${errs.length === 1 ? " does" : "s do"} not hold ` +
          `(first: ${errs[0].code} ${errs[0].message.slice(0, 80)}${errs[0].message.length > 80 ? "…" : ""})`,
      }));
    }
  } catch {
    // A malformed contract is `validate`'s finding to make, not a reason
    // for `next` to fall over.
  }

  // A pending intake is the very first thing to resolve: until it is
  // converted, product.md and the specs are still empty scaffolding.
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");
  const intakeExists = isFile(intakePath);
  if (intakeExists) {
    const status = (listHeader(read(intakePath), "Status") ?? "pending").toLowerCase();
    if (status !== "converted") {
      actions.push(action({
        id: "intake-pending",
        command: "intake",
        runnable: true,
        why: "a pending intake awaits conversion into product.md and specs",
      }));
    }
  } else if (specCapabilities(projectRoot).length === 0) {
    // And the state BEFORE that one, which had no action at all (second
    // audit). `init` does not write an intake.md — deliberately: an empty
    // pending intake would be a mould passing for content, which change 0065
    // just made a refusable thing. So the condition that means "the specs are
    // not written yet" is read from what IS on disk: no capability spec.
    //
    // Without this the bootstrap door was invisible at exactly the moment it
    // was needed. The hub tells the agent to check a file `init` never
    // creates, and `prime`, `next` and `doctor` named `intake` nowhere.
    actions.push(action({
      id: "bootstrap-unspecced",
      command: "intake",
      args: ["--text", '"<what this project is>"'],
      severity: "blocking",
      why: "no capability is specced yet, so nothing states what this project must do",
      text: 'doctrina intake --text "<what this project is>" — no capability is specced yet; ' +
        "for an existing codebase, `doctrina work --from-diff` backfills from the code instead",
    }));
  }

  // Open changes drive the loop: finish what is started before opening more.
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    for (const id of readdirSync(changesDir).sort()) {
      if (id === "archive" || id.startsWith(".")) continue;
      if (!isDir(path.join(changesDir, id))) continue;
      const proposalPath = path.join(changesDir, id, "proposal.md");
      if (!isFile(proposalPath)) {
        actions.push(action({
          id: "change-missing-proposal",
          why: `add a proposal.md to .doctrina/changes/${id}/ (open changes need one)`,
        }));
        continue;
      }
      const status = listHeader(read(proposalPath), "Status") ?? "proposed";
      if (status === "applied") {
        actions.push(action({
          id: "change-archive-pending",
          command: "change archive",
          args: [id],
          gate: "archive",
          runnable: true,
          why: "applied but not archived",
        }));
        continue;
      }
      const tasksPath = path.join(changesDir, id, "tasks.md");
      const unchecked = isFile(tasksPath)
        ? (read(tasksPath).match(/^-\s+\[ \]/gm) ?? []).length
        : 0;
      if (unchecked > 0) {
        // Deliberately NOT runnable, and deliberately without a command:
        // the only thing that clears this is doing the work. `change tick`
        // would tick the box, which is the dishonesty every gate here
        // exists to prevent.
        actions.push(action({
          id: "change-tasks-open",
          why: `complete ${unchecked} open task${unchecked === 1 ? "" : "s"} in .doctrina/changes/${id}/tasks.md`,
        }));
        continue;
      }
      const deltas = walk(path.join(changesDir, id, "specs")).filter((p) => p.endsWith("delta.md"));
      if (deltas.length > 0) {
        actions.push(action({
          id: "change-apply-ready",
          command: "analyze",
          args: [id],
          gate: "structure",
          runnable: true,
          why: `tasks done, ${deltas.length} delta${deltas.length === 1 ? "" : "s"} ready`,
          text: `doctrina analyze ${id}, then doctrina change apply ${id} — ` +
            `tasks done, ${deltas.length} delta${deltas.length === 1 ? "" : "s"} ready`,
        }));
      } else {
        actions.push(action({
          id: "change-deltas-missing",
          command: "change apply",
          args: [id],
          why: `add spec deltas under .doctrina/changes/${id}/specs/, or apply as metadata-only`,
          text: `add spec deltas under .doctrina/changes/${id}/specs/, ` +
            `or apply as metadata-only: doctrina change apply ${id}`,
        }));
      }
    }
  }

  // ADRs stuck in proposed need a human decision; accepted-but-bare ADRs are
  // the rot the review flagged — a decision with nothing behind it (no Evidence,
  // no Landed) is drift waiting to be superseded. Surface the proposed ones
  // first (a pending decision blocks more than a missing stamp).
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  /** @type {Action[]} */
  const landNudges = [];
  const isBareValue = (v) => {
    const t = (v ?? "").trim();
    return t === "" || t === "—" || t === "-";
  };
  for (const f of walk(adrDir)) {
    if (!f.endsWith(".md")) continue;
    const m = path.basename(f).match(/^(\d{4})-/);
    if (!m) continue;
    const text = read(f);
    const status = listHeader(text, "Status");
    if (status && status.toLowerCase() === "proposed") {
      // Accepting a decision is the human's call, not a step to automate:
      // `runnable` stays false however mechanical the header edit is.
      actions.push(action({
        id: "adr-proposed",
        command: "decision accept",
        args: [m[1]],
        why: `ADR ${m[1]} is still proposed`,
        text: `review ADR ${m[1]} (${relPath(projectRoot, f)}): doctrina decision accept ${m[1]}, or supersede it`,
      }));
    } else if (status && status.toLowerCase() === "accepted") {
      // Bare only when BOTH anchors are empty (Evidence header present-but-bare
      // and no Landed stamp). An ADR that opts out of Evidence entirely
      // (header absent) is not nagged.
      const evidence = listHeader(text, "Evidence");
      const landed = listHeader(text, "Landed");
      if (evidence !== null && isBareValue(evidence) && isBareValue(landed)) {
        landNudges.push(action({
          id: "adr-unproven",
          command: "decision land",
          args: [m[1]],
          severity: "advisory",
          why: `nothing proves ADR ${m[1]}`,
          text: `record what proves ADR ${m[1]}: cite its **Evidence:**, or once it ships, doctrina decision land ${m[1]}`,
        }));
      }
    }
  }
  for (const n of landNudges) actions.push(n);

  // No procedural memory captured yet, but the history shows a fix-shaped
  // change — exactly the lesson a skill exists to keep from being relearned
  // (review §5: the change-0003 "tolerate LLM code fences" case). One gentle
  // nudge, only when skills are empty, so it never nags a project that opted in.
  const skillNudge = suggestSkillCapture(projectRoot);
  if (skillNudge) actions.push(skillNudge);

  // GATE SIGNALS. `next` used to answer "no open work" over a tree where
  // `doctor` reported five findings with a named remedy each: it knew the
  // change/ADR/index/intake/runtime/skill lifecycle and nothing about whether
  // the gates were satisfied. The command whose entire job is to answer "what
  // now?" was the one that said "nothing" (second audit).
  //
  // Change 0037 unified the views so they could not disagree; this is that
  // unification finally reaching `next`. Same collections, same numbers — the
  // only difference is that a view REPORTS and an action RECOMMENDS.
  // The gates measure capabilities, so they say nothing before any exists. A
  // freshly initialised project must be told to run `intake`, not to write
  // acceptance criteria for capabilities it has not named yet — three tidy
  // recommendations ahead of the one that matters is the noise this whole
  // change exists to remove.
  const hasSpecs = specCapabilities(projectRoot).length > 0;

  const cov = hasSpecs ? (gates.coverage ?? safely(() => coverageSummary(projectRoot))) : null;
  if (cov) {
    if (cov.totalDangling > 0) {
      actions.push(action({
        id: "coverage-dangling",
        command: "coverage",
        gate: "coverage",
        why: `${cov.totalDangling} acceptance criterion(s) cite evidence missing on disk`,
      }));
    } else if (cov.totalCriteria === 0) {
      actions.push(action({
        id: "coverage-none",
        command: null,
        gate: "coverage",
        severity: "advisory",
        why: "no acceptance criteria declared yet — nothing proves any capability",
        text: "write acceptance criteria with cited evidence — no capability is proven yet " +
          "(`doctrina coverage` reports them once they exist)",
      }));
    }
  }

  const tr = hasSpecs ? (gates.trace ?? safely(() => traceSummary(projectRoot))) : null;
  if (tr) {
    if (tr.dropped > 0) {
      actions.push(action({
        id: "trace-dropped",
        command: "trace",
        gate: "trace",
        why: `${tr.dropped} product intent anchor(s) are realized by no spec`,
      }));
    } else if (tr.anchors === 0) {
      actions.push(action({
        id: "trace-no-anchors",
        command: null,
        gate: "trace",
        severity: "advisory",
        why: "no intent anchors declared in product.md, so nothing traces to product intent",
        text: 'tag product.md success criteria as "- [SC1] ..." and cite them with ' +
          "**Realizes:** in each spec — nothing traces to product intent yet",
      }));
    }
  }

  // An active spec still `planned` with no note is an inventory claim: the
  // document says the capability is current and the axis says nothing is built.
  const inventoryClaims = activeButUnbuilt(projectRoot);
  if (inventoryClaims.length > 0) {
    actions.push(action({
      id: "spec-inventory-claim",
      command: "spec set",
      args: [inventoryClaims[0], "--implementation", "auto"],
      gate: "validate",
      why: `${inventoryClaims.length} active spec(s) are still "planned" with no note ` +
        `(${inventoryClaims.slice(0, 3).join(", ")})`,
    }));
  }

  // The build gate undeclared is the quietest failure of all: `close` skips
  // step 7 and every change ships without the project's own tests ever running.
  const verify = hasSpecs ? (gates.verify ?? readVerifyState(projectRoot)) : { configured: true, invalid: false };
  if (verify.invalid) {
    actions.push(action({
      id: "verify-invalid",
      command: null,
      gate: "verify",
      why: ".doctrina/verify.json is not valid JSON, so the build gate cannot run",
      text: "fix .doctrina/verify.json — it is not valid JSON, so `doctrina verify` " +
        "and the close's build gate cannot run",
    }));
  } else if (!verify.configured) {
    actions.push(action({
      id: "verify-unconfigured",
      command: "verify",
      args: ["--init"],
      gate: "verify",
      // NOT runnable, though the command is one call: `verify --init` writes a
      // fail-closed placeholder that a person still has to replace with the
      // project's real commands, so running it unattended is not the whole of
      // what the action asks for. Marking it runnable in change 0064 was a
      // mistake — `next --run` picked it, found no runner registered, and
      // errored where it should have said the next step needs a person.
      why: "no .doctrina/verify.json — the close skips its build gate entirely",
    }));
  }

  // Index drift is silent rot; surface it last.
  try {
    const current = idx.load(projectRoot);
    if (!indexesMatch(deriveIndex(projectRoot, current), current)) {
      actions.push(action({
        id: "index-drift",
        command: "index rebuild",
        gate: "index",
        runnable: true,
        why: "index.json has drifted from the tree",
      }));
    }
  } catch {
    actions.push(action({
      id: "index-unreadable",
      command: "index rebuild",
      gate: "index",
      runnable: true,
      why: "index.json is missing or unreadable",
    }));
  }

  return actions;
}

// Return a single skill-capture nudge, or null. Fires only when no skill has
// been written yet (skills/ holds nothing but .gitkeep) AND the archive shows a
// fix-shaped change whose lesson is the textbook case for a skill. Deterministic
// pattern match on the archived folder name — a hint, never a decision (ADR 0005).

function suggestSkillCapture(projectRoot) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (isDir(skillsDir)) {
    const hasSkill = walk(skillsDir).some((f) => f.endsWith(".md"));
    if (hasSkill) return null; // opted in already — never nag
  }
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");
  if (!isDir(archiveDir)) return null;
  for (const name of readdirSync(archiveDir).sort()) {
    if (!isDir(path.join(archiveDir, name))) continue;
    const id = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    if (FIX_SHAPED.test(id)) {
      return action({
        id: "skill-capture",
        command: "skill new",
        args: ["<slug>"],
        severity: "advisory",
        why: "a past fix went uncaptured and no skill exists yet",
        text: `capture a skill from past fixes (e.g. "${id}"): doctrina skill new <slug> — ` +
          `on-demand procedural memory so the next agent does not relearn it (none exist yet)`,
      });
    }
  }
  return null;
}

// A collector that throws is a finding for `validate` to make, never a reason
// for `next` to fall over — the same posture the runtime block above takes.
function safely(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

// Whether the project declares its build gate. Deliberately the same three
// states `doctor` reports — configured, absent, invalid — read the same way.
function readVerifyState(projectRoot) {
  const p = path.join(projectRoot, ".doctrina", "verify.json");
  if (!isFile(p)) return { configured: false, invalid: false };
  try {
    const cfg = JSON.parse(read(p));
    return { configured: Array.isArray(cfg?.checks) && cfg.checks.length > 0, invalid: false };
  } catch {
    return { configured: false, invalid: true };
  }
}

// Active capability specs whose Implementation is still a bare "planned".
// A note after the value ("planned — backend deferred to Q3") is the declared
// gap and is left alone, exactly as `validate` leaves it alone.
function specCapabilities(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (!isDir(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isFile(path.join(specsDir, e.name, "spec.md")))
    .map((e) => e.name)
    .sort();
}

function activeButUnbuilt(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const out = [];
  for (const cap of specCapabilities(projectRoot)) {
    const entry = { name: cap };
    const file = path.join(specsDir, entry.name, "spec.md");
    const text = read(file);
    const status = (specHeader(text, "Status") ?? "").toLowerCase();
    const impl = (specHeader(text, "Implementation") ?? "").trim();
    if (status !== "active") continue;
    if (impl.toLowerCase() === "planned") out.push(entry.name);
  }
  return out.sort();
}
