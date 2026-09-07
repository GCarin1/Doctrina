// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, relPath, walk } from "./fs-ops.js";
import * as idx from "./index-json.js";
import { deriveIndex, indexesMatch, listHeader } from "./scan.js";
import { collectRuntimeFindings } from "./runtime.js";

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
 * @returns {Action[]}
 */
export function computeActions(projectRoot) {
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
  if (isFile(intakePath)) {
    const status = (listHeader(read(intakePath), "Status") ?? "pending").toLowerCase();
    if (status !== "converted") {
      actions.push(action({
        id: "intake-pending",
        command: "intake",
        runnable: true,
        why: "a pending intake awaits conversion into product.md and specs",
      }));
    }
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
const FIX_SHAPED = /(?:^|-)(fix|bug|hotfix|patch|parse|parsing|tolerate|workaround|race|deadlock|flaky|retry|escape|sanitize|sanitise)(?:-|$)/;

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
