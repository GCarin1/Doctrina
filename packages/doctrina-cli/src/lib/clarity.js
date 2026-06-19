// Deterministic under-specification detector for free-text briefs and
// intakes — the clarification gate (review Topic A). It does NOT judge
// meaning (that stays the agent's job, ADR 0005); it flags input that is
// structurally too thin to spec from, so `intake` and `work` prompt the
// agent to clarify with the user before speculating a spec or change out of
// too little. Advisory only: it surfaces the gap, it does not block.

const WEASEL = /\b(might|could|perhaps|maybe|probably|somehow|approximately|roughly|etc)\b/gi;
const VAGUE = /\b(some|several|various|appropriate|robust|scalable|nice|good|better|fast|simple|stuff|things?)\b/gi;

// Generic verbs/nouns that carry no capability information on their own. A
// brief made only of these ("add the feature", "do the thing") names nothing
// concrete to build.
const FILLER = new Set([
  "the", "and", "for", "with", "this", "that", "something", "anything",
  "make", "add", "create", "build", "implement", "feature", "thing",
  "things", "stuff", "task", "work", "please", "just", "some", "any",
]);

// Assess a brief/intake. `kind` tunes the thresholds: a one-line work prompt
// is held to a lower bar than a full project intake.
export function assessBrief(text, { kind = "prompt" } = {}) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  const tokens = clean ? clean.split(" ") : [];
  const words = tokens.length;
  const vague = (clean.match(VAGUE) ?? []).length + (clean.match(WEASEL) ?? []).length;
  const meaningful = tokens
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 3 && !FILLER.has(t));

  const minWords = kind === "intake" ? 20 : 3;
  const maxVague = kind === "intake" ? 4 : 2;

  const reasons = [];
  if (words < minWords) {
    reasons.push(
      `only ${words} word${words === 1 ? "" : "s"} — say what the behaviour is, ` +
        `what the inputs are, and how you'll know it's done`,
    );
  }
  if (words > 0 && meaningful.length === 0) {
    reasons.push("no concrete terms once filler words are removed — name the actual capability or behaviour");
  }
  if (vague >= maxVague) {
    reasons.push(`${vague} vague/weasel term${vague === 1 ? "" : "s"} — replace with definite, checkable wording`);
  }

  return { thin: reasons.length > 0, words, reasons };
}
