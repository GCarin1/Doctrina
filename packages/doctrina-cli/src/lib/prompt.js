import readline from "node:readline";

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

export async function confirm(question, { defaultYes = false } = {}) {
  const suffix = defaultYes ? "Y/n" : "y/N";
  const ans = await ask(`${question} (${suffix})`);
  if (!ans) return defaultYes;
  return /^y(es)?$/i.test(ans);
}
