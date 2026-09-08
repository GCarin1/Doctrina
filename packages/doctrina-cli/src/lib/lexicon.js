// @ts-check

// ONE lexicon (audit findings F5/F6).
//
// `work` ranked a prompt against the spec tree with one stop list, and
// `context --for` ranked the same prompt with a different one — while the
// work playbook tells the agent to run `context` immediately after `work`.
// Two rankers, in sequence, on the same text, free to disagree about which
// capability it is about. And `FIX_SHAPED` appeared byte for byte in two
// modules, so a term added to one classifier silently did not reach the
// other.
//
// What follows is the whole vocabulary the CLI uses to read natural
// language: how text is folded, what counts as a content word, and how
// strongly a document answers a query. Every consumer reads it from here.
//
// It is deliberately small and deterministic. The CLI does no natural-
// language interpretation (ADR 0005) — these functions rank, they never
// decide, and the playbook says so at the point the ranking is shown.

/**
 * Fold to comparable ASCII-ish lowercase: strip combining marks so a
 * Portuguese prompt and an ASCII spec match on the same word ("função" and
 * "funcao"), and lowercase so case never decides relevance.
 */
export function fold(text) {
  return String(text ?? "").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

/**
 * The connective tissue of a task description, in English and Portuguese.
 *
 * Deliberately conservative: it covers grammar and the verbs every prompt
 * uses ("add", "create", "implementar"), and nothing domain-specific — a
 * stop list that swallowed a real term would quietly make retrieval worse
 * in exactly the cases it is supposed to help.
 */
export const STOPWORDS = new Set([
  // en — grammar
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "for",
  "from", "has", "have", "how", "i", "if", "in", "into", "is", "it", "its",
  "of", "on", "or", "should", "that", "the", "then", "this", "to", "up",
  "was", "we", "what", "when", "where", "which", "why", "will", "with",
  "shall", "must",
  // en — the verbs and nouns every feature prompt carries
  "make", "add", "new", "use", "create", "implement", "feature", "system",
  "user", "users",
  // pt (ASCII-folded) — grammar
  "uma", "umas", "uns", "dos", "das", "nos", "nas", "por", "para", "com",
  "que", "sem", "aos", "nao", "mais", "ser", "quando", "esta", "sao",
  "pela", "pelo", "deve", "de", "do", "da", "no", "na", "em", "ao", "os",
  "as", "um", "ou", "se", "eh", "pra",
  // pt — the same verbs and nouns
  "faca", "fazer", "criar", "crie", "novo", "nova", "adicionar", "adicione",
  "implementar", "implemente", "funcionalidade", "sistema", "usuario",
  "usuarios",
]);

/**
 * The content words of a query: folded, de-duplicated, stop words dropped.
 *
 * A term must be at least two characters, so an initial or a stray letter
 * never becomes a search term — but "id", "ci" and "pt" survive, and those
 * are real terms in this domain.
 */
export function terms(query) {
  if (query === undefined || query === null) return [];
  const words = fold(query).match(/[a-z][a-z0-9-]+/g) ?? [];
  return [...new Set(words.filter((w) => !STOPWORDS.has(w)))];
}

/**
 * How strongly a document answers the query, as a comparable TUPLE rather
 * than one blended number — so the tiebreak order is readable and no
 * weighting constant has to be guessed:
 *
 *   [ terms in the title/id, terms in the body, hits per 1000 chars ]
 *
 * Density, not raw hit count, breaks the final tie. Raw hits reward a
 * document for being long: the 473-line `cli` spec out-scored `skills` on
 * the query "write a skill from git history" purely on volume, which is the
 * length bias that makes naive retrieval useless on a mature tree.
 */
export function relevance(text, queryTerms, emphasis = "") {
  if (queryTerms.length === 0) return [0, 0, 0];
  const hay = fold(text);
  const head = fold(emphasis);
  let inTitle = 0;
  let inBody = 0;
  let hits = 0;
  for (const term of queryTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = `(^|[^a-z0-9-])${escaped}`;
    const n = (hay.match(new RegExp(boundary, "g")) ?? []).length;
    if (n > 0) {
      inBody += 1;
      hits += n;
    }
    if (head && new RegExp(boundary).test(head)) inTitle += 1;
  }
  const density = hay.length > 0 ? Math.round((hits / hay.length) * 1000) : 0;
  return [inTitle, inBody, density];
}

/**
 * The same relevance, projected onto ONE comparable number.
 *
 * `work` shows a score in a column and `context` orders by the tuple; both
 * must agree about which capability a prompt is about, so the scalar is a
 * PROJECTION of the tuple rather than a second calculation. The weights only
 * have to preserve the tuple's own ordering — title beats body beats
 * density — which is what the lexicographic comparison already says.
 */
export function score(text, queryTerms, emphasis = "") {
  const [inTitle, inBody, density] = relevance(text, queryTerms, emphasis);
  return inTitle * 100 + inBody * 10 + Math.min(density, 9);
}

/**
 * A slug or identifier that reads as a FIX rather than a feature — the
 * signal `skill suggest` and `next` both look for when deciding whether an
 * archived change taught a lesson worth capturing.
 *
 * One definition: it lived byte for byte in two modules, so a term added to
 * one classifier did not reach the other.
 */
export const FIX_SHAPED =
  /(?:^|-)(fix|bug|hotfix|patch|parse|parsing|tolerate|workaround|race|deadlock|flaky|retry|escape|sanitize|sanitise)(?:-|$)/;

/**
 * The same idea applied to a commit subject. Narrower than FIX_SHAPED on
 * purpose: a subject is prose, so it needs the conventional-commit shape or
 * an explicit fix verb rather than a bare word match.
 */
export const FIX_SHAPED_SUBJECT =
  /^(fix|bugfix|hotfix|patch)(\(|:|!)|^(revert)\b|\b(fixes|fixed|regression|workaround)\b/i;

/**
 * Which language a document is written in, by counting each lexicon's
 * grammar words. Used by `clarify` to pick its smell lexicon when the
 * project declares no language.
 */
const PT_GRAMMAR = /\b(que|n[aã]o|para|uma|como|mais|ser|quando|est[aá]|s[aã]o|pela|pelo|dos|das|ou seja|deve)\b/gi;
const EN_GRAMMAR = /\b(the|and|that|with|shall|when|this|from|are|not|for|must)\b/gi;

export function detectLanguage(text) {
  const pt = (String(text).match(PT_GRAMMAR) ?? []).length;
  const en = (String(text).match(EN_GRAMMAR) ?? []).length;
  return pt > en ? "pt" : "en";
}

/**
 * The margin a ranked winner must hold over the runner-up before a caller
 * may ACT on the ranking rather than merely display it.
 *
 * `triage` calls a verdict confident when the winning lane beats the
 * runner-up by 2. Copying that number here would copy a unit, not the
 * notion: on `score()` above, every signal is worth 10 or 100 and the
 * density tie-breaker alone moves the number by up to 9. A gap of 2 can
 * therefore mean the two specs matched exactly the same terms and one of
 * them is shorter — the opposite of confidence.
 *
 * 10 is the smallest gap density CANNOT produce: it is one whole body
 * term. Density is capped at 9 precisely so it can only break ties, so a
 * margin at or above 10 says the winner led on term overlap itself.
 */
export const CONFIDENT_MARGIN = 10;
