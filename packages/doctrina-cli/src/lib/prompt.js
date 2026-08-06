import readline from "node:readline";
import process from "node:process";

// Is there a real person on the other end? Every prompt must ask this
// first. `init` checked it before the ADAPTER prompt but not before the
// project-description prompt, so a non-interactive caller that forgot
// --non-interactive got a project with a blank description and no warning
// (audit item C9).
export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function ask(question, { defaultValue = "" } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = defaultValue ? `${question} [${defaultValue}] ` : `${question} `;
  try {
    const answer = await new Promise((resolve) => rl.question(prompt, resolve));
    return answer.trim() || defaultValue;
  } finally {
    rl.close();
  }
}

// Ask for consent. Off a terminal there is nobody to ask, so the answer is
// `whenNonInteractive` — which callers set to false for destructive
// operations: silence is not consent.
export async function confirm(question, { defaultYes = false, whenNonInteractive = null } = {}) {
  if (!isInteractive()) {
    return whenNonInteractive === null ? defaultYes : whenNonInteractive;
  }
  const suffix = defaultYes ? "Y/n" : "y/N";
  const ans = await ask(`${question} (${suffix})`);
  if (!ans) return defaultYes;
  return /^y(es)?$/i.test(ans);
}
