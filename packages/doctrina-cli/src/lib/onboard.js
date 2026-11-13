// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { checklistProgress, parseChangeTitle } from "./doc-model.js";
import { intakeStatus } from "./intake-model.js";
import { parseAcceptanceCriteria } from "./criteria.js";
import { collect } from "./coverage-model.js";
import { gitLines } from "./git.js";

// THE CYCLE ONCE, ON THE REAL REPOSITORY (change 0256).
//
// A newcomer had the reference (2,900 lines), a getting-started page, and
// `next`, which names one action and assumes the reader knows why. Nothing
// walked the whole cycle once. OpenSpec's `onboard` does that with a model
// narrating; here the CLI reads where the project stands and prints the
// walk — what each step is for, what to run, what to tell the human, and
// where to stop and ask — and the agent is the guide.
//
// Every "done" below is read from the tree, never stored: a tour that
// remembers its own progress is a second place for a fact to go stale.

const CODE_FILE = /\.(py|js|mjs|cjs|ts|tsx|jsx|go|rs|java|kt|rb|php|cs|swift|scala|c|cc|cpp|h|hpp|sh)$/i;
const TODO_LINE = /\b(TODO|FIXME)\b[:\s-]*(.{0,90})/;
const FILES_READ = 400;
const FILE_BYTES = 200_000;
export const CANDIDATES_SHOWN = 3;

/**
 * Where the project stands, read from the tree.
 * @param {string} projectRoot
 */
export function onboardState(projectRoot) {
  const dir = path.join(projectRoot, ".doctrina");
  const installed = isDir(dir);
  const specsDir = path.join(dir, "specs");
  const specs = isDir(specsDir)
    ? readdirSync(specsDir).filter((cap) => isFile(path.join(specsDir, cap, "spec.md"))).sort()
    : [];
  const intake = path.join(dir, "intake.md");
  const intakePending = isFile(intake) && intakeStatus(read(intake)) === "pending";
  const changesDir = path.join(dir, "changes");
  const open = [];
  if (isDir(changesDir)) {
    for (const id of readdirSync(changesDir).filter((d) => /^\d{4}-/.test(d)).sort()) {
      const proposal = path.join(changesDir, id, "proposal.md");
      if (!isFile(proposal)) continue;
      const tasksPath = path.join(changesDir, id, "tasks.md");
      const p = isFile(tasksPath) ? checklistProgress(read(tasksPath)) : { total: 0, done: 0, placeholders: 0 };
      open.push({
        id,
        title: parseChangeTitle(read(proposal)) ?? "",
        planned: p.total > 0 && p.placeholders === 0,
        ticked: p.total > 0 && p.placeholders === 0 && p.done === p.total,
        tasks: { total: p.total, done: p.done },
      });
    }
  }
  const archiveDir = path.join(changesDir, "archive");
  const archived = isDir(archiveDir)
    ? readdirSync(archiveDir).filter((d) => /^\d{4}-\d{2}-\d{2}-\d{4}-/.test(d)).sort()
    : [];
  const hasCode = codeFiles(projectRoot, 1).length > 0;
  return {
    installed, specs, intakePending, hasCode, open,
    closed: archived.length,
    lastClosed: archived.length > 0 ? `.doctrina/changes/archive/${archived[archived.length - 1]}/` : null,
  };
}

/** Tracked code files, as git lists them; none outside a repository. */
function codeFiles(projectRoot, limit) {
  const out = [];
  for (const f of gitLines(projectRoot, ["ls-files", "--cached", "--others", "--exclude-standard"])) {
    if (f.startsWith(".doctrina/") || /(^|\/)(node_modules|vendor|dist|build)\//.test(f) || !CODE_FILE.test(f)) continue;
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Small, real first tasks read from this repository: a criterion with no
 * proof yet, then a TODO somebody left in the code.
 * @param {string} projectRoot
 * @returns {{ kind: "criterion" | "todo", where: string, text: string, prompt: string }[]}
 */
export function firstTaskCandidates(projectRoot) {
  const out = [];
  for (const report of collect(projectRoot)) {
    if (out.length >= CANDIDATES_SHOWN) break;
    const criteria = parseAcceptanceCriteria(read(report.specPath));
    for (const row of report.rows) {
      if (out.length >= CANDIDATES_SHOWN) break;
      const kind = "was" in row ? row.was : row.kind;
      if (kind !== "bare" && kind !== "dangling") continue;
      const body = String(criteria[row.n - 1]?.body ?? "").replace(/^\[[a-z]+\]\s*/i, "").replace(/\s+—\s+(verified|proven|evidenced|demonstrated) by .*$/i, "").trim();
      if (body === "") continue;
      out.push({
        kind: /** @type {"criterion"} */ ("criterion"),
        where: `${report.cap} #${row.n}`,
        text: `${kind === "bare" ? "no proof cited" : "the proof it cites is missing"}: ${clip(body, 90)}`,
        prompt: `prove ${report.cap} criterion ${row.n}: ${clip(body, 70)}`,
      });
    }
  }
  let read_ = 0;
  for (const f of codeFiles(projectRoot, FILES_READ)) {
    if (out.length >= CANDIDATES_SHOWN * 2) break;
    const abs = path.join(projectRoot, f);
    if (!isFile(abs)) continue;
    let text;
    try {
      text = read(abs);
    } catch {
      continue;
    }
    if (text.length > FILE_BYTES || ++read_ > FILES_READ) continue;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(TODO_LINE);
      if (!m || m[2].trim().length < 8) continue;
      const note = m[2].trim().replace(/\s*(\*\/|-->)\s*$/, "");
      out.push({ kind: /** @type {"todo"} */ ("todo"), where: `${f}:${i + 1}`, text: `${m[1]} ${clip(note, 90)}`, prompt: clip(note, 70) });
      break;
    }
  }
  return out.slice(0, CANDIDATES_SHOWN * 2);
}

const clip = (/** @type {string} */ s, /** @type {number} */ n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * The walk: every step with whether the tree says it is done, what it is
 * for, what to run and where to ask. `current` is the first one not done.
 * @param {ReturnType<typeof onboardState>} state
 */
export function onboardSteps(state) {
  const first = state.open[0] ?? null;
  const id = first?.id ?? "<id>";
  const ran = state.closed > 0;
  const steps = [
    { id: "install", title: "Install",
      done: state.installed,
      evidence: state.installed ? ".doctrina/ and AGENTS.md are here" : "",
      say: "Doctrina keeps what the system should do in `.doctrina/` and tells every agent how to work in `AGENTS.md`; nothing else in the repository is touched.",
      run: ["doctrina init"],
      ask: "" },
    { id: "describe", title: "Describe the project",
      done: state.installed && state.specs.length > 0 && !state.intakePending,
      evidence: state.specs.length > 0 ? `${state.specs.length} capability spec${state.specs.length === 1 ? "" : "s"} (${state.specs.slice(0, 4).join(", ")}${state.specs.length > 4 ? ", …" : ""})` : "",
      say: "The specs are the current truth: one per capability, each requirement a testable sentence, each criterion citing its proof. Everything after this step changes them through a change.",
      run: state.intakePending
        ? ["doctrina intake    # the stored description is pending: execute the playbook it prints"]
        : [state.hasCode ? "doctrina intake --from-code    # describe what the code does today" : 'doctrina intake --text "<what the project is, in a paragraph>"'],
      ask: state.hasCode ? "what the code cannot tell: who uses it, and what must never break." : "for the project in a paragraph: who it is for and what it must do." },
    { id: "first-task", title: "Pick a first task and open it",
      done: state.open.length > 0 || ran,
      evidence: first ? `${first.id} is open` : (ran ? "a change was opened and closed" : ""),
      say: "A request that changes behaviour becomes a change before code is edited; the CLI scaffolds it and prints the playbook. Small and real beats a toy: the cycle is learned on work that matters.",
      run: ['doctrina work "<the task>"'],
      ask: "to choose one of the candidates, or to name a small task of their own — something done in under an hour." },
    { id: "plan", title: "Write the delta and the tasks",
      done: ran || state.open.some((ch) => ch.planned),
      evidence: first?.planned ? `${first.id} has ${first.tasks.total} task${first.tasks.total === 1 ? "" : "s"} written` : "",
      say: "The delta is the sentence the spec gains or loses; the tasks are how the code gets there. Nothing is implemented yet — this is the moment the human reads and corrects.",
      run: [`doctrina work --resume ${id}    # the playbook`, `doctrina change check ${id}    # would the close pass?`],
      ask: "whether the requirement you wrote is what they meant — show it to them before any code.",
      askAfter: true },
    { id: "implement", title: "Implement and prove",
      done: ran || state.open.some((ch) => ch.ticked),
      evidence: first?.ticked ? `every task of ${first.id} is ticked` : "",
      say: "Each task is implemented and ticked, and each new criterion cites the test that proves it: `coverage` reads that citation, not the claim.",
      run: [`doctrina change tick ${id} <n>`, "doctrina verify"],
      ask: "" },
    { id: "close", title: "Close",
      done: ran,
      evidence: ran ? `${state.closed} change${state.closed === 1 ? "" : "s"} closed — the last at ${state.lastClosed}` : "",
      say: "One command merges the delta into the spec, runs every gate and archives the change. If it refuses, the change is not done — it names what is missing.",
      run: [`doctrina close ${id}`],
      ask: "" },
  ];
  const at = steps.findIndex((s) => !s.done);
  return { steps, current: at < 0 ? null : steps[at].id };
}

/** What a project that already ran the cycle shows a newcomer. */
export function tourLines(state) {
  const cap = state.specs[0] ?? "<capability>";
  return [
    "doctrina prime                 # the state of the project in one read — every session starts here",
    `doctrina why ${cap}${" ".repeat(Math.max(1, 17 - cap.length))}# why a capability exists: intent, proof, decisions, history`,
    ...(state.lastClosed ? [`${state.lastClosed}proposal.md    # a finished change, start to end`] : []),
    'doctrina work "<request>"      # the next request — it says by itself when no change is needed',
    "doctrina hooks install         # once per clone: the commit hook and the merge drivers",
  ];
}
