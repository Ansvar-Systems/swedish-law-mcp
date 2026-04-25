/**
 * statute-id.ts — Document ID resolution for Swedish Law MCP.
 *
 * Resolves human-readable Act titles (e.g. "Miljöbalken") to internal
 * document IDs (e.g. "1998:808"). Allows search and stance tools to
 * accept the same inputs as get_provision / check_currency.
 */

import type { Database } from '@ansvar/mcp-sqlite';

/**
 * Resolve a document_id that may be:
 *  1. An exact internal ID (e.g. "1998:808") — returned as-is if it exists
 *  2. A title or partial title — looked up via LIKE match
 *
 * Returns the resolved internal ID, or null if no match found.
 */
export function resolveDocumentId(db: Database, input: string): string | null {
  // 1. Try exact match on id
  const exact = db.prepare(
    'SELECT id FROM legal_documents WHERE id = ? LIMIT 1'
  ).get(input) as { id: string } | undefined;
  if (exact) return exact.id;

  // 2. Try exact match on title
  const byTitle = db.prepare(
    'SELECT id FROM legal_documents WHERE title = ? LIMIT 1'
  ).get(input) as { id: string } | undefined;
  if (byTitle) return byTitle.id;

  // 3. Try exact match on short_name (before fuzzy — "DSL" must not
  //    lose to a LIKE hit on "dataskyddslag" in a different document)
  const byShortName = db.prepare(
    'SELECT id FROM legal_documents WHERE short_name = ? LIMIT 1'
  ).get(input) as { id: string } | undefined;
  if (byShortName) return byShortName.id;

  // 4. Try LIKE match on title (case-insensitive partial match)
  const byLike = db.prepare(
    'SELECT id FROM legal_documents WHERE title LIKE ? LIMIT 1'
  ).get(`%${input}%`) as { id: string } | undefined;
  if (byLike) return byLike.id;

  // 5. Try LIKE match on short_name
  const byShortNameLike = db.prepare(
    'SELECT id FROM legal_documents WHERE short_name LIKE ? LIMIT 1'
  ).get(`%${input}%`) as { id: string } | undefined;
  if (byShortNameLike) return byShortNameLike.id;

  // 6. Strip "SFS " prefix and retry as ID (callers often pass "SFS 2018:218")
  const sfsStripped = input.replace(/^SFS\s+/i, '');
  if (sfsStripped !== input) {
    const byStripped = db.prepare(
      'SELECT id FROM legal_documents WHERE id = ? LIMIT 1'
    ).get(sfsStripped) as { id: string } | undefined;
    if (byStripped) return byStripped.id;
  }

  return null;
}

/**
 * Normalize a human-readable provision reference to the internal format.
 *
 *   "1 kap. 1 §"   → "1:1"
 *   "3 kap. 5 a §"  → "3:5 a"
 *   "5 §"           → "5"
 *   "5 a §"         → "5 a"
 *   "3:5"           → "3:5"  (already canonical)
 *   "5"             → "5"    (already canonical)
 */
export function normalizeProvisionRef(input: string): string {
  const trimmed = input.trim();

  // Already in canonical format (digits, optional letter, optional colon+digits)
  if (/^\d+(\s*[a-z])?(:\d+(\s*[a-z])?)?$/.test(trimmed)) {
    return trimmed;
  }

  // "N kap. M §" or "N kap. M a §"
  const chaptered = trimmed.match(
    /^(\d+)\s*kap\.\s*(\d+\s*[a-z]?)\s*§?$/i
  );
  if (chaptered) {
    return `${chaptered[1].trim()}:${chaptered[2].trim()}`;
  }

  // "M §" or "M a §" (flat statute)
  const flat = trimmed.match(/^(\d+\s*[a-z]?)\s*§$/i);
  if (flat) {
    return flat[1].trim();
  }

  // Unrecognized — return as-is and let the DB query decide
  return trimmed;
}
