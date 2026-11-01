export interface QueryValidation {
  valid: boolean;
  errors: string[];
}

function outsideQuotedPhrases(query: string): string {
  let quoted = false;
  let escaped = false;
  return [...query].map((character) => {
    if (escaped) { escaped = false; return " "; }
    if (character === "\\" && quoted) { escaped = true; return " "; }
    if (character === '"') { quoted = !quoted; return " "; }
    return quoted ? " " : character;
  }).join("");
}

export function validateBooleanQuery(query: string): QueryValidation {
  const errors: string[] = [];
  let quoted = false;
  let escaped = false;
  let depth = 0;
  for (let index = 0; index < query.length; index += 1) {
    const character = query[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && quoted) { escaped = true; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth < 0) { errors.push(`Unexpected closing parenthesis at position ${index + 1}.`); depth = 0; }
    }
  }
  if (quoted) errors.push("A quoted phrase is not closed.");
  if (depth > 0) errors.push(`${depth} opening parenthesis(es) are not closed.`);
  if (/[\*[\]{}<>]/.test(outsideQuotedPhrases(query))) errors.push("LinkedIn does not support wildcard asterisks or bracket grouping in Boolean search.");
  const tokens = outsideQuotedPhrases(query).match(/\b(?:and|or|not)\b/gi) ?? [];
  if (tokens.some((token) => token !== token.toUpperCase())) errors.push("Boolean operators must be uppercase for LinkedIn search.");
  return { valid: errors.length === 0, errors };
}
