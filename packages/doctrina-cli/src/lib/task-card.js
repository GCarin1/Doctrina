// @ts-check
import path from "node:path";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import { getSection, parseChangeTitle, parseChecklist } from "./doc-model.js";
import { listHeader, deltaCapabilities, parseAdrScope } from "./scan.js";
import { extractOps } from "./spec-ops.js";
import { findWorkspace } from "./workspace.js";
import { deliveryPath, resolveDeliveryId, sectionText } from "./delivery.js";
import { sliceSpec, withoutComments } from "./context-slice.js";
import { terms } from "./lexicon.js";

// A TASK CARD (change 0222, ADR 0030): one task of a change, carrying what
// an executor needs to do it ALONE — the task, the lines indented under it
// (files, requirement, verify command), why the change exists, and the spec
// cut to the task. A subagent does not see the planner's conversation, so
// the card is the whole of its context; a card that needs the conversation
// is a card the planner has not finished writing.

/**
 * The tasks.md boxes, each with the indented lines under it.
 * Ordinals are the same ones `change tick` uses (tasks.md comes first).
 */
export function taskBoxes(tasksText) {
  const lines = String(tasksText).replace(/\r\n/g, "\n").split("\n");
  return parseChecklist(tasksText).map((box, i) => {
    const indent = (lines[box.line].match(/^\s*/)?.[0] ?? "").length;
    const details = [];
    for (let j = box.line + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") {
        if (details.length) break;
        continue;
      }
      if ((l.match(/^\s*/)?.[0] ?? "").length <= indent) break;
      details.push(l.trim().replace(/^[-*]\s+/, ""));
    }
    return { ordinal: i + 1, text: box.text, checked: box.checked, placeholder: box.placeholder, details };
  });
}

/** The `Field: value` lines of a card's details, keyed by lowercased field. */
export function cardFields(details) {
  const out = {};
  for (const d of details) {
    const m = d.match(/^([A-Za-z][A-Za-z ]{0,20}):\s*(.+)$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

function firstParagraph(text, heading) {
  const m = String(text).match(new RegExp(`^## ${heading}\\s*\\n+([\\s\\S]*?)(?:\\n\\s*\\n|\\n## |$)`, "m"));
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, "").trim() : "";
}

/**
 * The card for task `ordinal` of a change — or, with no ordinal, the first
 * open one. Null `card` with a reason when there is none to give.
 * @returns {{ card: null, reason: string } | { card: object, reason: null }}
 */
export function taskCard(projectRoot, changeId, ordinal = /** @type {number | null} */ (null)) {
  const changeDir = path.join(projectRoot, ".doctrina", "changes", changeId);
  const tasksPath = path.join(changeDir, "tasks.md");
  if (!isFile(tasksPath)) return { card: null, reason: "the change has no tasks.md" };
  const boxes = taskBoxes(read(tasksPath));
  if (boxes.length === 0) return { card: null, reason: "tasks.md has no task box" };
  let box;
  if (ordinal === null) {
    box = boxes.find((b) => !b.checked && !b.placeholder);
    // Only scaffold boxes left is not "every task is ticked" (third audit,
    // change 0234): the planner was told to review and close a change
    // whose tasks no one had written.
    if (!box && boxes.some((b) => !b.checked && b.placeholder)) return { card: null, reason: "tasks.md holds only the scaffold's placeholder boxes — write the tasks as cards first" };
    if (!box) return { card: null, reason: "every task is ticked — the change is ready for review and close" };
  } else {
    box = boxes.find((b) => b.ordinal === ordinal);
    if (!box) return { card: null, reason: `no task ${ordinal} (tasks.md has ${boxes.length})` };
  }
  if (box.placeholder) return { card: null, reason: `task ${box.ordinal} is a scaffold placeholder — write the task first` };
  // CRLF on a Windows checkout: the Why is read paragraph by paragraph.
  const proposal = isFile(path.join(changeDir, "proposal.md")) ? read(path.join(changeDir, "proposal.md")).replace(/\r\n/g, "\n") : "";
  const fields = cardFields(box.details);
  // What this change DOES to each spec (change 0231). The slice below is
  // the spec as it stands — the current truth, before apply — so the
  // requirement the executor is there to implement lived only in the delta,
  // and reached the card only if the planner copied it into a line by hand.
  const changes = [];
  for (const cap of deltaCapabilities(changeDir)) {
    const delta = path.join(changeDir, "specs", cap, "delta.md");
    if (!isFile(delta)) continue;
    for (const op of extractOps(read(delta))) {
      if (op.verb === "append-requirement") changes.push({ capability: cap, line: `adds ${/^[aeiou]/.test(op.section) ? "an" : "a"} ${op.section} requirement: ${op.value}` });
      else if (op.verb === "replace-requirement") changes.push({ capability: cap, line: `replaces ${op.section} requirement ${op.n} with: ${op.value}` });
      else if (op.verb === "remove-requirement") changes.push({ capability: cap, line: `removes ${op.section} requirement ${op.n}` });
      else if (op.verb === "append-criterion") changes.push({ capability: cap, line: `adds the criterion: ${op.value}` });
      else if (op.verb === "replace-criterion") changes.push({ capability: cap, line: `replaces criterion ${op.n} with: ${op.value}` });
      else if (op.verb === "remove-criterion") changes.push({ capability: cap, line: `removes criterion ${op.n}` });
    }
  }
  // The task's words AND what the change writes into the spec (second
  // audit, change 0233): a card for "lock the account on the third wrong
  // password" cut the spec's only /login requirement, because the task never
  // said "login" — the delta it implements did. Requirements only: a
  // criterion's "[unverified] … — verified by `…`" matched any spec's
  // placeholder on the boilerplate alone.
  const query = terms([box.text, ...box.details, parseChangeTitle(proposal) ?? "", ...changes.filter((ch) => / requirement[^:]*: /.test(ch.line)).map((ch) => ch.line.slice(ch.line.indexOf(": ") + 2))].join(" "));
  const slices = [];
  for (const cap of deltaCapabilities(changeDir)) {
    const rel = `.doctrina/specs/${cap}/spec.md`;
    const specPath = path.join(projectRoot, rel);
    if (!isFile(specPath)) continue;
    // Nothing in the spec matched the task: the whole spec, as `context`
    // gives it (change 0231). Dropping it left a card with no spec at all.
    const text = read(specPath);
    const slice = sliceSpec(text, query, rel);
    slices.push(slice ? { capability: cap, ...slice } : { capability: cap, text: withoutComments(text) ?? text, kept: null, total: null, whole: true });
  }
  return {
    card: {
      change: changeId,
      title: parseChangeTitle(proposal) ?? changeId,
      delivery: listHeader(proposal, "Delivery") ?? null,
      ordinal: box.ordinal,
      total: boxes.length,
      done: boxes.filter((b) => b.checked).length,
      checked: box.checked,
      text: box.text,
      details: box.details,
      fields,
      why: firstParagraph(proposal, "Why"),
      slices,
      changes,
      story: deliveryStory(projectRoot, listHeader(proposal, "Delivery")),
      decisions: bindingDecisions(projectRoot, deltaCapabilities(changeDir)),
    },
    reason: null,
  };
}

// The story the change serves, when it belongs to a delivery (change 0231):
// its acceptance criteria are what the work is checked against, and they
// live in the workspace, where an executor opened in the repository never
// looks.
const STORY_MAX_CHARS = 1500;
function deliveryStory(projectRoot, deliveryId) {
  if (!deliveryId) return null;
  const found = findWorkspace(projectRoot);
  if (!found) return null;
  const id = resolveDeliveryId(found.dir, deliveryId.trim());
  if (!id || !isFile(deliveryPath(found.dir, id))) return null;
  const story = sectionText(read(deliveryPath(found.dir, id)), "Story");
  if (!story) return null;
  return story.length > STORY_MAX_CHARS ? `${story.slice(0, STORY_MAX_CHARS).replace(/\s+\S*$/, "")} …` : story;
}

// The accepted decisions that bind the capabilities the change touches:
// those whose Scope names one, and the unscoped ones that cite one. A card
// the executor follows without them is how an implementation re-decides
// what an ADR settled.
function bindingDecisions(projectRoot, capabilities) {
  const dir = path.join(projectRoot, ".doctrina", "decisions");
  if (!isDir(dir) || capabilities.length === 0) return { list: [], more: 0 };
  /** @type {Array<{ id: string, title: string, decision: string, rank: number }>} */
  const found = [];
  for (const f of walk(dir).sort()) {
    const m = path.basename(f).match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(f).replace(/\r\n/g, "\n");
    if ((listHeader(text, "Status") ?? "").trim().toLowerCase() !== "accepted") continue;
    const scope = parseAdrScope(text);
    const cites = (/** @type {string} */ cap) => new RegExp(`(^|[^a-z0-9-])${cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9-]|$)`, "im").test(text);
    // An unscoped ADR is GLOBAL — it binds every capability, as `decision
    // scope` documents and the context pack loads it (sixth audit, change
    // 0237). The card bound one only when its text named the capability, so
    // a repository-wide rule ("error codes are MAIUSCULAS_SNAKE") never
    // reached the executor, who reads nothing else. Scoped first, then the
    // global ones that name the capability, then the rest.
    const rank = scope.length > 0 ? (capabilities.some((cap) => scope.includes(cap)) ? 0 : -1) : (capabilities.some(cites) ? 1 : 2);
    if (rank < 0) continue;
    const decision = (getSection(text, "Decision") ?? "").replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").trim();
    found.push({
      id: m[1],
      title: text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m)?.[1]?.trim() ?? path.basename(f),
      decision: decision.length > DECISION_EXCERPT ? `${decision.slice(0, DECISION_EXCERPT).replace(/\s+\S*$/, "")} …` : decision,
      rank,
    });
  }
  const sorted = found.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  return { list: sorted.slice(0, DECISIONS_ON_CARD), more: Math.max(0, sorted.length - DECISIONS_ON_CARD) };
}

// How many binding decisions a card names, and how much of each it quotes.
const DECISIONS_ON_CARD = 8;
const DECISION_EXCERPT = 240;

