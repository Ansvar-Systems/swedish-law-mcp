/**
 * search_legislation — Full-text search across Swedish statute provisions.
 */

import type { Database } from 'better-sqlite3';

export interface SearchLegislationInput {
  query: string;
  document_id?: string;
  status?: string;
  limit?: number;
}

export interface SearchLegislationResult {
  document_id: string;
  document_title: string;
  provision_ref: string;
  chapter: string | null;
  section: string;
  title: string | null;
  snippet: string;
  relevance: number;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function searchLegislation(
  db: Database,
  input: SearchLegislationInput
): Promise<SearchLegislationResult[]> {
  if (!input.query || input.query.trim().length === 0) {
    return [];
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const safeQuery = escapeFTS5Query(input.query);

  let sql = `
    SELECT
      lp.document_id,
      ld.title as document_title,
      lp.provision_ref,
      lp.chapter,
      lp.section,
      lp.title,
      snippet(provisions_fts, 0, '>>>', '<<<', '...', 32) as snippet,
      bm25(provisions_fts) as relevance
    FROM provisions_fts
    JOIN legal_provisions lp ON lp.id = provisions_fts.rowid
    JOIN legal_documents ld ON ld.id = lp.document_id
    WHERE provisions_fts MATCH ?
  `;

  const params: (string | number)[] = [safeQuery];

  if (input.document_id) {
    sql += ` AND lp.document_id = ?`;
    params.push(input.document_id);
  }

  if (input.status) {
    sql += ` AND ld.status = ?`;
    params.push(input.status);
  }

  sql += ` ORDER BY relevance LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params) as SearchLegislationResult[];
}

function escapeFTS5Query(query: string): string {
  return query.replace(/[()^*:]/g, (char) => `"${char}"`);
}
