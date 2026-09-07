// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { classify } from "../lib/triage-model.js";

// The classifier is shared with `work`; see lib/triage-model.js.
export { classify } from "../lib/triage-model.js";
import { emitJson } from "../lib/json-out.js";
import { collectRuntimeFindings, checkLocalEnv } from "../lib/runtime.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

// Classify BEFORE scaffolding.
//
// `doctrina work` was the default answer to every request, so a broken
// workflow, an invalid env value, and a suite that ran nothing all became
// changes with a proposal, tasks and a spec delta — half an hour of
// artifact for a bug the YAML already explained, and a close that was
// theatre on top of a diagnosis. Meanwhile the actual cause sat in a file
// no gate read.
//
// Three lanes, because three kinds of request fail differently:
//
//   PRODUCT  behaviour changes -> `doctrina work` earns its ceremony: a
//            spec delta is the point, because the truth is changing.
//   RUNTIME  something is wired wrong, empty, or ran nothing. There is no
//            spec delta to write — the requirement already exists and the
//            implementation does not honour it. Diagnose first.
//   CHORE    implementation-only work whose requirement is already
//            specified: `doctrina work --chore`, no EARS delta.
//
// The classifier is deterministic term matching, and it is a HINT, not a
// verdict — the same contract `work` already makes about its capability
// guess. It never refuses; it names the lane and lets the agent decide.

export const jsonNative = true;

export const flags = { boolean: ["json", "env"], string: [] };




/**
 * Score a prompt against each lane. Deterministic, explainable, and cheap:
 * the caller gets the winning lane AND the signals that produced it, so a
 * wrong guess is arguable rather than mysterious.
 */

export async function run(positional, cmdFlags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  const json = flagBool(cmdFlags, "json", false);
  const withEnv = flagBool(cmdFlags, "env", false);
  const prompt = positional.join(" ").trim();

  const runtime = collectRuntimeFindings(projectRoot);
  const envFindings = withEnv ? checkLocalEnv(projectRoot) : [];
  const findings = [...runtime.findings, ...envFindings];
  const errors = findings.filter((f) => f.level === "error");
  const verdict = prompt ? classify(prompt) : null;

  if (json) {
    emitJson("triage", {
      lane: verdict?.lane ?? null,
      confident: verdict?.confident ?? null,
      contracts: runtime.contracts,
      declared: runtime.declared,
      findings,
      errors: errors.length,
    });
    return errors.length > 0 ? 1 : 0;
  }

  if (verdict) renderLane(prompt, verdict);
  renderRuntime(runtime, envFindings, withEnv, Boolean(verdict));

  return errors.length > 0 ? 1 : 0;
}

function renderLane(prompt, verdict) {
  const LABEL = {
    product: c.green("PRODUCT"),
    runtime: c.yellow("RUNTIME"),
    chore: c.cyan("CHORE"),
  };
  console.log(c.bold("Lane") + c.gray(" — deterministic term match; a hint, not a decision"));
  console.log("");
  console.log(`  ${LABEL[verdict.lane]}${verdict.confident ? "" : c.gray("  (weak signal — read the playbook and override if it is wrong)")}`);
  const hits = verdict.scores[verdict.lane].hits;
  if (hits.length > 0) console.log(c.gray(`  signals: ${[...new Set(hits)].slice(0, 6).join(", ")}`));
  console.log("");

  if (verdict.lane === "product") {
    console.log("This changes what the system should DO — the ceremony is the point:");
    console.log(`  ${c.cyan(`doctrina work "${truncate(prompt)}"`)}`);
    console.log(c.gray("  spec delta -> tasks -> implement -> close"));
  } else if (verdict.lane === "chore") {
    console.log("The requirement already exists; only the implementation moves:");
    console.log(`  ${c.cyan(`doctrina work --chore "${truncate(prompt)}"`)}`);
    console.log(c.gray("  short proposal + patch + verify, no EARS delta"));
    console.log(c.gray("  needing a spec delta means it was never a chore — reopen without --chore"));
  } else {
    console.log("Nothing here says the SPEC is wrong — the running system is.");
    console.log("Diagnose before scaffolding anything:");
    console.log(`  ${c.cyan("doctrina contract check")}   the declared wiring vs the workflow`);
    console.log(`  ${c.cyan("doctrina triage --env")}     local .env vs the declared enums (names only)`);
    console.log(`  ${c.cyan("doctrina verify")}           the real build gate, with its output expectations`);
    console.log(c.gray("  Open a change only once the diagnosis shows the requirement itself is missing."));
  }
  console.log("");
}

function renderRuntime(runtime, envFindings, withEnv, hadLane) {
  if (hadLane) console.log(c.bold("Runtime") + c.gray(" — the declared surface, checked"));
  else console.log(c.bold("Runtime triage") + c.gray(" — the declared surface, checked"));
  console.log("");

  if (runtime.contracts === 0) {
    console.log(c.gray("  no contracts in .doctrina/contracts/ — nothing declares the runtime surface"));
    console.log(c.gray("  start one: ") + c.cyan("doctrina contract new system"));
    console.log("");
    return;
  }
  if (runtime.declared === 0) {
    console.log(c.gray(`  ${runtime.contracts} contract${runtime.contracts === 1 ? "" : "s"}, 0 Wiring/Selectors rows — the runtime surface is UNCHECKED, not verified`));
    console.log(c.gray("  declare what CI injects and what your selectors are, and this becomes a gate"));
    console.log("");
    return;
  }

  const all = [...runtime.findings, ...envFindings];
  if (all.length === 0) {
    console.log(c.green("  ok") + `  ${runtime.declared} declared row${runtime.declared === 1 ? " holds" : "s hold"} across ${runtime.contracts} contract${runtime.contracts === 1 ? "" : "s"}` + (withEnv ? " (including local .env)" : ""));
    console.log("");
    return;
  }

  for (const f of all) {
    const mark = f.level === "error" ? c.red("  ✗") : c.yellow("  !");
    console.log(`${mark}  ${f.message} ${c.gray(`[${f.code}]`)}`);
    console.log(`      ${c.gray(`fix: ${f.remedy}`)}`);
  }
  console.log("");
  const errors = all.filter((f) => f.level === "error").length;
  const warns = all.length - errors;
  if (errors > 0) console.log(c.red("fail") + ` ${errors} runtime error${errors === 1 ? "" : "s"}, ${warns} warning${warns === 1 ? "" : "s"} — fix the wiring, not the spec`);
  else console.log(c.yellow("warn") + ` ${warns} advisory finding${warns === 1 ? "" : "s"}`);
}

function truncate(s, max = 60) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export const help = `
Usage: doctrina triage ["<prompt>"] [--env]

Classify a request BEFORE scaffolding, and diagnose the running system.

With a prompt, name the lane the request belongs to:
  PRODUCT   behaviour changes -> doctrina work (the spec delta is the point)
  RUNTIME   wired wrong, empty, or ran nothing -> diagnose; no delta to write
  CHORE     implementation-only, already specified -> doctrina work --chore

The classifier is deterministic term matching and prints the signals it
matched: a HINT, like the capability guess in \`work\`. It never refuses.

With or without a prompt, it also runs the runtime checks over every
contract (the same checks as \`contract check\`, and the same verdict):
declared wiring vs the workflow, empty-vs-unset consumer defaults,
declared enums, and selectors that would match nothing.

  --env    also check the local .env against the declared enums. Reports
           NAMES and membership only — a rejected value is never printed.

Exit 0 when no runtime errors (warnings allowed), 1 when any error stands.
`;
