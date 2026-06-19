import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, loadTemplateTree, materialiseEntry, substitute } from "../lib/templates.js";
import { today } from "../lib/dates.js";
import { cliVersion } from "../lib/version.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { ask } from "../lib/prompt.js";
import { writeIntakeFile, printBootstrapPlaybook, warnIfThinIntake } from "./intake.js";

const SUPPORTED_AGENTS = [
  "claude",
  "codex",
  "cursor",
  "copilot",
  "gemini",
  "aider",
  "windsurf",
  "continue",
  "amp",
  "devin",
  "factory",
  "jules",
];

export async function run(_positional, flags) {
  const force = flagBool(flags, "force", false);
  const nonInteractive = flagBool(flags, "non-interactive", false);
  const projectRoot = process.cwd();
  const projectName = flagString(flags, "project-name") ?? path.basename(projectRoot);
  const date = flagString(flags, "date") ?? today();

  // --intake hands over the FULL description up front (ADR 0005); the
  // one-line summary is then derived instead of prompted for.
  const intakeFile = flagString(flags, "intake");
  let intakeBody = null;
  if (intakeFile) {
    const intakeAbs = path.resolve(projectRoot, intakeFile);
    if (!isFile(intakeAbs)) {
      console.error(c.red("error:") + ` --intake file not found: ${intakeFile}`);
      return 1;
    }
    intakeBody = read(intakeAbs);
    if (intakeBody.trim().length === 0) {
      console.error(c.red("error:") + ` --intake file is empty: ${intakeFile}`);
      return 1;
    }
  }

  let description = flagString(flags, "project-description") ?? "";
  if (!description && intakeBody) {
    description = firstLineSummary(intakeBody);
  }
  if (!description && !nonInteractive) {
    description = await ask("One-sentence project description:");
  }

  const agentSelector = flagString(flags, "agent");
  const fromPath = flagString(flags, "from");
  const agentsMdPath = path.join(projectRoot, "AGENTS.md");
  const doctrinaDir = path.join(projectRoot, ".doctrina");

  if (!force && (exists(agentsMdPath) || exists(doctrinaDir))) {
    console.error(c.red("error:") + " AGENTS.md or .doctrina/ already exists at this path");
    console.error(c.gray("hint: ") + "pass --force to overwrite");
    return 1;
  }

  // Resolve --from conventions source if supplied.
  let fromAgentsContent = null;
  let fromProductContent = null;
  if (fromPath) {
    const fromAbs = path.resolve(projectRoot, fromPath);
    if (!isDir(fromAbs)) {
      console.error(c.red("error:") + ` --from path is not a directory: ${fromPath}`);
      return 1;
    }
    const fromAgents = path.join(fromAbs, "AGENTS.md");
    const fromProduct = path.join(fromAbs, ".doctrina", "product.md");
    if (isFile(fromAgents)) fromAgentsContent = read(fromAgents);
    if (isFile(fromProduct)) fromProductContent = read(fromProduct);
    if (!fromAgentsContent && !fromProductContent) {
      console.error(c.yellow("warn:") + ` no AGENTS.md or .doctrina/product.md found at ${fromPath}, proceeding with defaults`);
    }
  }

  const templatesDir = locateTemplatesDir();
  const tokens = {
    PROJECT_NAME: projectName,
    PROJECT_DESCRIPTION: description,
    DATE: date,
    AGENTS_MD_PATH: "AGENTS.md",
    // Stamp the framework version into the scaffolded index.json. init writes
    // it straight from the template (bypassing idx.save), so the token is the
    // stamp point here. (3.6)
    FRAMEWORK_VERSION: cliVersion(),
  };

  // Root AGENTS.md — with optional --from base content prepended.
  const agentsTemplatePath = path.join(templatesDir, "AGENTS.md.template");
  const agentsTemplateBody = read(agentsTemplatePath);
  const projectAgents = substitute(agentsTemplateBody, tokens);
  const finalAgents = fromAgentsContent
    ? fromAgentsContent.replace(/\n+$/, "") + "\n\n---\n\n## Project-specific\n\n" + projectAgents
    : projectAgents;
  write(agentsMdPath, finalAgents, { force });
  console.log(c.green("created") + ` ${relPath(projectRoot, agentsMdPath)}` + (fromAgentsContent ? " (with --from base)" : ""));
  const finalLines = finalAgents.split("\n").length;
  if (finalLines > 150) {
    console.log(c.yellow("warn:") + ` AGENTS.md is ${finalLines} lines (>150 soft cap); consider trimming the base`);
  }

  // .doctrina/ skeleton
  const skeleton = loadTemplateTree(templatesDir, "doctrina");
  for (const entry of skeleton) {
    // Inject --from product.md vision if present
    if (fromProductContent && entry.relativePath === "product.md.template") {
      const visionMatch = fromProductContent.match(/##\s+Vision\b[\s\S]*?(?=\n##\s|$)/);
      const visionBlock = visionMatch ? visionMatch[0].trim() : fromProductContent.trim();
      const projectBody = substitute(entry.body, tokens);
      const merged = `# ${projectName} — Product\n\n## Conventions base (from ${fromPath})\n\n${visionBlock}\n\n---\n\n${projectBody.replace(/^#[^\n]*\n+/, "")}`;
      const dest = path.join(doctrinaDir, "product.md");
      write(dest, merged, { force });
      console.log(c.green("created") + ` ${relPath(projectRoot, dest)} (with --from base)`);
      continue;
    }
    const written = materialiseEntry(entry, doctrinaDir, tokens, { force });
    console.log(c.green("created") + ` ${relPath(projectRoot, written)}`);
  }

  // Adapters
  if (agentSelector) {
    const agents = agentSelector === "all" ? SUPPORTED_AGENTS : [agentSelector];
    for (const agent of agents) {
      if (!SUPPORTED_AGENTS.includes(agent)) {
        console.error(c.yellow("warn:") + ` unknown agent "${agent}", skipping`);
        continue;
      }
      installAdapter(templatesDir, projectRoot, agent, tokens, { force });
    }
  }

  if (intakeBody) {
    const intakePath = writeIntakeFile(projectRoot, {
      body: intakeBody,
      source: relPath(projectRoot, path.resolve(projectRoot, intakeFile)),
      projectName,
      date,
      force,
    });
    console.log(c.green("created") + ` ${relPath(projectRoot, intakePath)}`);
  }

  console.log("");
  console.log(c.bold("Doctrina initialised."));
  if (intakeBody) {
    console.log(`Next: execute the bootstrap playbook below — it converts the intake into`);
    console.log(`${c.cyan(".doctrina/product.md")} and capability specs. Any AGENTS.md-aware agent`);
    console.log(`runs it on its own; reprint anytime with ${c.cyan("doctrina intake")}.`);
    console.log("");
    warnIfThinIntake(intakeBody);
    printBootstrapPlaybook(projectRoot);
  } else {
    console.log(`Next: edit ${c.cyan("AGENTS.md")} and ${c.cyan(".doctrina/product.md")} for your project.`);
  }
  return 0;
}

// First non-empty line of the intake, stripped of Markdown heading marks
// and clipped, as the one-line description token for the templates.
function firstLineSummary(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const cleaned = line.replace(/^#+\s*/, "").trim();
  return cleaned.length > 120 ? cleaned.slice(0, 117).trimEnd() + "..." : cleaned;
}

function installAdapter(templatesDir, projectRoot, agent, tokens, opts) {
  const tree = loadTemplateTree(templatesDir, path.join("adapters", agent));
  for (const entry of tree) {
    if (entry.relativePath === "README.md") continue;
    const adapterTokens = {
      ...tokens,
      AGENTS_MD_PATH: adapterAgentsMdRelativePath(entry.relativePath),
    };
    const written = materialiseEntry(entry, projectRoot, adapterTokens, opts);
    console.log(c.green(`adapter[${agent}]`) + ` ${relPath(projectRoot, written)}`);
  }
}

function adapterAgentsMdRelativePath(relativePath) {
  const cleaned = relativePath.replace(/\.template$/, "");
  const depth = cleaned.split("/").length - 1;
  return depth === 0 ? "AGENTS.md" : "../".repeat(depth) + "AGENTS.md";
}

export const help = `
Usage: doctrina init [options]

Scaffold AGENTS.md and the .doctrina/ skeleton in the current directory.

Options:
  --project-name <name>          Override the project name (default: basename of cwd)
  --project-description <text>   One-sentence description
  --agent <name>                 Install adapter for one agent
                                 (claude|codex|cursor|copilot|gemini|aider|windsurf|continue|amp|devin|factory|jules|all)
  --intake <file>                Full project description; stored verbatim at .doctrina/intake.md
                                 and used to derive the one-line description when absent.
                                 Follow up with \`doctrina intake\` for the bootstrap playbook
  --from <path>                  Local conventions directory; if it contains AGENTS.md and/or
                                 .doctrina/product.md, the content is folded into the new project
  --date <YYYY-MM-DD>            Override the system date
  --force                        Overwrite existing files
  --non-interactive              Fail instead of prompting for missing values
`;
