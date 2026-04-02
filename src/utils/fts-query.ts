/**
 * Utilities for building robust FTS5 queries from natural-language input.
 *
 * If the user provides explicit FTS syntax (quotes, boolean operators, wildcards),
 * we preserve it. Otherwise we convert tokens to prefix terms so inflections like
 * "make" -> "maken" can match.
 */

const EXPLICIT_FTS_SYNTAX_PATTERN = /["*():^]|\bAND\b|\bOR\b|\bNOT\b/iu;

function sanitizeToken(token: string): string {
  return token.replace(/[^\p{L}\p{N}_]/gu, '');
}

function extractTokens(query: string): string[] {
  const matches = query.normalize('NFC').match(/[\p{L}\p{N}_]+/gu) ?? [];
  return matches
    .map(sanitizeToken)
    .filter(token => token.length > 1);
}

function escapeExplicitQuery(query: string): string {
  return query.replace(/[()^:]/g, (char) => `"${char}"`);
}

function buildPrefixAndQuery(tokens: string[]): string {
  return tokens.map(token => `${token}*`).join(' ');
}

function buildPrefixOrQuery(tokens: string[]): string {
  return tokens.map(token => `${token}*`).join(' OR ');
}

/**
 * Trim inflectional suffixes to broaden prefix matching.
 *
 * European languages add 1-3 character suffixes for case, number, and
 * tense (e.g. Swedish: personliga/personligen share stem "personlig").
 * FTS5 prefix `personliga*` misses `personligen` — trimming to
 * `personlig*` catches both.  Only trims tokens longer than 6 chars
 * to avoid over-broadening short roots.
 */
function trimToStem(token: string): string {
  if (token.length > 6) {
    return token.slice(0, token.length - 2);
  }
  return token;
}

function buildStemmedPrefixAndQuery(tokens: string[]): string {
  return tokens.map(token => `${trimToStem(token)}*`).join(' ');
}

export interface FtsQueryVariants {
  primary: string;
  stemmed?: string;
  fallback?: string;
}

export function buildFtsQueryVariants(query: string): FtsQueryVariants {
  const trimmed = query.trim();
  if (!trimmed) {
    return { primary: '' };
  }

  if (EXPLICIT_FTS_SYNTAX_PATTERN.test(trimmed)) {
    return { primary: escapeExplicitQuery(trimmed) };
  }

  const tokens = extractTokens(trimmed);
  if (tokens.length === 0) {
    return { primary: escapeExplicitQuery(trimmed) };
  }

  const primary = buildPrefixAndQuery(tokens);
  if (tokens.length === 1) {
    return { primary };
  }

  const stemmed = buildStemmedPrefixAndQuery(tokens);
  const hasStemmedDiff = stemmed !== primary;

  return {
    primary,
    stemmed: hasStemmedDiff ? stemmed : undefined,
    fallback: buildPrefixOrQuery(tokens),
  };
}

