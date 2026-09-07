// @ts-check
// Writing the intake and printing the bootstrap playbook.
//
// `init --intake` performs the same three operations `intake` does, and
// reached into `commands/intake.js` for them (audit finding F7). They are
// operations over the tree, not renderings of one command, so both
// entry points read them from here.
import path from "node:path";
import { exists, isFile, read, relPath, write } from "./fs-ops.js";
import { assessBrief } from "./clarity.js";
import { c } from "./colors.js";
// Clarification gate (review Topic A). A description too thin to spec from is
// the moment to ask the user, not to let the agent invent requirements. Prints
// the specific gaps before the bootstrap playbook; advisory, never blocking —
// the intake is still captured verbatim (the playbook step 6 resolves it).
export function warnIfThinIntake(body) {
  const assessment = assessBrief(body, { kind: "intake" });
  if (!assessment.thin) return;
  console.log(c.yellow("⚠ thin intake — clarify with the user before converting to specs:"));
  for (const reason of assessment.reasons) console.log(`    - ${reason}`);
  console.log("");
}

// Shared with `init --intake`. Writes the intake verbatim under a small
// status header; the agent flips Status to converted at the end of the
// playbook, which is how `next` knows the bootstrap is done.
export function writeIntakeFile(projectRoot, { body, source, projectName, date, force = false }) {
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");
  const content = [
    `# Intake — ${projectName}`,
    "",
    "- **Status:** pending",
    `- **Date:** ${date}`,
    `- **Source:** ${source}`,
    "",
    "<!-- Raw project intent, stored verbatim. The bootstrap playbook",
    "     (doctrina intake) converts it into product.md and capability",
    "     specs, then flips Status to converted. After conversion the",
    "     specs are the only source of truth; never edit this file to",
    "     change requirements. -->",
    "",
    "---",
    "",
    body.replace(/\r\n/g, "\n").replace(/\n*$/, "\n"),
  ].join("\n");
  write(intakePath, content, { force });
  return intakePath;
}

// Exported so `init --intake` can print the same playbook inline instead
// of bouncing the user to a second command.
export function printBootstrapPlaybook(projectRoot) {
  const hasSpecs = exists(path.join(projectRoot, ".doctrina", "specs"));
  console.log(c.bold("Bootstrap playbook") + c.gray(" — agent-executed (ADR 0005); the CLI does no interpretation."));
  console.log("");
  console.log("Execute in order, in a single linear pass:");
  console.log("");
  console.log(`1. Read ${c.cyan(".doctrina/intake.md")} (raw intent) and ${c.cyan(".doctrina/product.md")}.`);
  console.log("");
  console.log("2. Fill every product.md section from the intake: Vision, Problem,");
  console.log("   Target users, Scope (in/out), Non-goals, Success criteria, and the");
  console.log("   Delivery order — name the ONE end-to-end walking skeleton to build");
  console.log("   and verify before fanning out (depth before breadth).");
  console.log("   One fact, one home — product.md holds vision, never requirements.");
  console.log("");
  console.log("3. Derive the capability list: kebab-case, one per area of behaviour");
  console.log("   (e.g. auth, billing, reports). For each capability:");
  console.log(`       ${c.cyan("doctrina spec new <capability>")}`);
  console.log("   then replace the template placeholders in");
  console.log("   .doctrina/specs/<capability>/spec.md with EARS requirements derived");
  console.log("   from the intake (Ubiquitous / Event-driven / State-driven /");
  console.log("   Unwanted-behavior / Optional). Keep the two axes honest — leave");
  console.log("   Implementation: planned for what is not built yet; keep aspiration");
  console.log("   under ## Maturity → Future, not in EARS; write concrete Acceptance");
  console.log("   criteria, each [unverified] until a cited test proves it.");
  console.log("");
  console.log("4. If the project spans services/front-ends, own the seams between");
  console.log("   them (port map, env, API/WS/event shapes) as a contract:");
  console.log(`       ${c.cyan("doctrina contract new <name>")} → fill it → ${c.cyan("doctrina contract check")}`);
  console.log("");
  console.log("5. Record any architectural decision the intake forces (cite Evidence):");
  console.log(`       ${c.cyan("doctrina decision new \"<title>\"")} → edit → ${c.cyan("doctrina decision accept <num>")}`);
  console.log("");
  console.log("6. Quality gates — fix everything they report before moving on:");
  console.log(`       ${c.cyan("doctrina clarify --all")}`);
  console.log(`       ${c.cyan("doctrina validate")}`);
  console.log(`       ${c.cyan("doctrina coverage")}   (and ${c.cyan("doctrina verify --init")} to declare the build gate)`);
  console.log("   If something in the intake is genuinely ambiguous, ask the user");
  console.log("   before assuming.");
  console.log("");
  console.log("7. Mark the intake consumed: in .doctrina/intake.md flip");
  console.log("   \"- **Status:** pending\" to \"- **Status:** converted\".");
  console.log("");
  console.log(`8. ${c.cyan("doctrina next")} — follow the recommendation. Implementation then`);
  console.log(`   flows through ${c.cyan("doctrina work \"<brief prompt>\"")}, one change at a time.`);
  if (!hasSpecs) {
    console.log("");
    console.log(c.yellow("warn:") + " .doctrina/specs/ is missing — re-run `doctrina init` first.");
  }
}
