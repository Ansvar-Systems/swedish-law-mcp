/**
 * build_legal_stance — Aggregate citations from multiple sources for a legal question.
 *
 * Searches across statutes, case law, and preparatory works to build
 * a comprehensive set of citations relevant to a legal topic.
 */

import type { Database } from 'better-sqlite3';

export interface BuildLegalStanceInput {
  query: string;
  document_id?: string;
  include_case_law?: boolean;
  include_preparatory_works?: boolean;
  limit?: number;
}

interface ProvisionHit {
  document_id: string;
  document_title: string;
  provision_ref: string;
  title: string | null;
  snippet: string;
  relevance: number;
}

interface CaseLawHit {
  document_id: string;
  title: string;
  court: string;
  decision_date: string | null;
  summary_snippet: string;
  relevance: number;
}

interface PrepWorkHit {
  statute_id: string;
  prep_document_id: string;
  title: string | null;
  summary_snippet: string;
  relevance: number;
}

export interface LegalStanceResult {
  query: string;
  provisions: ProvisionHit[];
  case_law: CaseLawHit[];
  preparatory_works: PrepWorkHit[];
  total_citations: number;
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export async function buildLegalStance(
  db: Database,
  input: BuildLegalStanceInput
): Promise<LegalStanceResult> {
  if (!input.query || input.query.trim().length === 0) {
    return { query: '', provisions: [], case_law: [], preparatory_works: [], total_citations: 0 };
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const safeQuery = input.query.replace(/[()^*:]/g, (char) => `"${char}"`);
  const includeCaseLaw = input.include_case_law !== false;
  const includePrepWorks = input.include_preparatory_works !== false;

  // Search provisions
  let provSql = `
    SELECT
      lp.document_id,
      ld.title as document_title,
      lp.provision_ref,
      lp.title,
      snippet(provisions_fts, 0, '>>>', '<<<', '...', 32) as snippet,
      bm25(provisions_fts) as relevance
    FROM provisions_fts
    JOIN legal_provisions lp ON lp.id = provisions_fts.rowid
    JOIN legal_documents ld ON ld.id = lp.document_id
    WHERE provisions_fts MATCH ?
  `;
  const provParams: (string | number)[] = [safeQuery];

  if (input.document_id) {
    provSql += ` AND lp.document_id = ?`;
    provParams.push(input.document_id);
  }
  provSql += ` ORDER BY relevance LIMIT ?`;
  provParams.push(limit);

  const provisions = db.prepare(provSql).all(...provParams) as ProvisionHit[];

  // Search case law
  let caseLaw: CaseLawHit[] = [];
  if (includeCaseLaw) {
    const clSql = `
      SELECT
        cl.document_id,
        ld.title,
        cl.court,
        cl.decision_date,
        snippet(case_law_fts, 0, '>>>', '<<<', '...', 32) as summary_snippet,
        bm25(case_law_fts) as relevance
      FROM case_law_fts
      JOIN case_law cl ON cl.id = case_law_fts.rowid
      JOIN legal_documents ld ON ld.id = cl.document_id
      WHERE case_law_fts MATCH ?
      ORDER BY relevance LIMIT ?
    `;
    caseLaw = db.prepare(clSql).all(safeQuery, limit) as CaseLawHit[];
  }

  // Search preparatory works
  let prepWorks: PrepWorkHit[] = [];
  if (includePrepWorks) {
    const pwSql = `
      SELECT
        pw.statute_id,
        pw.prep_document_id,
        pw.title,
        snippet(prep_works_fts, 1, '>>>', '<<<', '...', 32) as summary_snippet,
        bm25(prep_works_fts) as relevance
      FROM prep_works_fts
      JOIN preparatory_works pw ON pw.id = prep_works_fts.rowid
      WHERE prep_works_fts MATCH ?
      ORDER BY relevance LIMIT ?
    `;
    prepWorks = db.prepare(pwSql).all(safeQuery, limit) as PrepWorkHit[];
  }

  return {
    query: input.query,
    provisions,
    case_law: caseLaw,
    preparatory_works: prepWorks,
    total_citations: provisions.length + caseLaw.length + prepWorks.length,
  };
}
