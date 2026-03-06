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

  // 3. Try LIKE match on title (case-insensitive partial match)
  const byLike = db.prepare(
    'SELECT id FROM legal_documents WHERE title LIKE ? LIMIT 1'
  ).get(`%${input}%`) as { id: string } | undefined;
  if (byLike) return byLike.id;

  return null;
}
