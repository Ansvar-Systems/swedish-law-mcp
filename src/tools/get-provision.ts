/**
 * get_provision — Retrieve a specific provision from a Swedish statute.
 */

import type { Database } from 'better-sqlite3';

export interface GetProvisionInput {
  document_id: string;
  chapter?: string;
  section?: string;
  provision_ref?: string;
}

export interface ProvisionResult {
  document_id: string;
  document_title: string;
  document_status: string;
  provision_ref: string;
  chapter: string | null;
  section: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  cross_references: CrossRefResult[];
}

interface CrossRefResult {
  target_document_id: string;
  target_provision_ref: string | null;
  ref_type: string;
}

interface ProvisionRow {
  document_id: string;
  document_title: string;
  document_status: string;
  provision_ref: string;
  chapter: string | null;
  section: string;
  title: string | null;
  content: string;
  metadata: string | null;
}

export async function getProvision(
  db: Database,
  input: GetProvisionInput
): Promise<ProvisionResult | ProvisionResult[] | null> {
  if (!input.document_id) {
    throw new Error('document_id is required');
  }

  // If provision_ref is directly provided, use it
  let provisionRef = input.provision_ref;
  if (!provisionRef) {
    if (input.chapter && input.section) {
      provisionRef = `${input.chapter}:${input.section}`;
    } else if (input.section) {
      provisionRef = input.section;
    }
  }

  // If no specific provision, return all provisions for the document
  if (!provisionRef) {
    return getAllProvisions(db, input.document_id);
  }

  const sql = `
    SELECT
      lp.document_id,
      ld.title as document_title,
      ld.status as document_status,
      lp.provision_ref,
      lp.chapter,
      lp.section,
      lp.title,
      lp.content,
      lp.metadata
    FROM legal_provisions lp
    JOIN legal_documents ld ON ld.id = lp.document_id
    WHERE lp.document_id = ? AND lp.provision_ref = ?
  `;

  const row = db.prepare(sql).get(input.document_id, provisionRef) as ProvisionRow | undefined;

  if (!row) {
    return null;
  }

  const crossRefs = db.prepare(`
    SELECT target_document_id, target_provision_ref, ref_type
    FROM cross_references
    WHERE source_document_id = ? AND (source_provision_ref = ? OR source_provision_ref IS NULL)
  `).all(input.document_id, provisionRef) as CrossRefResult[];

  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    cross_references: crossRefs,
  };
}

function getAllProvisions(db: Database, documentId: string): ProvisionResult[] {
  const sql = `
    SELECT
      lp.document_id,
      ld.title as document_title,
      ld.status as document_status,
      lp.provision_ref,
      lp.chapter,
      lp.section,
      lp.title,
      lp.content,
      lp.metadata
    FROM legal_provisions lp
    JOIN legal_documents ld ON ld.id = lp.document_id
    WHERE lp.document_id = ?
    ORDER BY lp.id
  `;

  const rows = db.prepare(sql).all(documentId) as ProvisionRow[];

  return rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    cross_references: [],
  }));
}
