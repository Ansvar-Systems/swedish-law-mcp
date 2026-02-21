/**
 * get_provision_eu_basis — Get EU legal basis for a specific provision.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import type { ProvisionEUReference } from '../types/index.js';
import {
  extractEUReferences,
  extractInlineEUArticleReferences,
  generateEUDocumentId,
} from '../parsers/eu-reference-parser.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface GetProvisionEUBasisInput {
  sfs_number: string;
  provision_ref: string;
}

export interface GetProvisionEUBasisResult {
  sfs_number: string;
  provision_ref: string;
  provision_content?: string;
  eu_references: ProvisionEUReference[];
}

interface StatuteEUContextRow {
  id: string;
  type: 'directive' | 'regulation';
  title: string | null;
  short_name: string | null;
  reference_type: string;
  is_primary_implementation: number;
}

function matchesKnownEUDocumentAlias(text: string, row: StatuteEUContextRow): boolean {
  const lowerText = text.toLowerCase();

  if (row.short_name && lowerText.includes(row.short_name.toLowerCase())) {
    return true;
  }

  if (row.id === 'regulation:2016/679') {
    return /dataskyddsförordning|gdpr/u.test(lowerText);
  }

  if (row.id === 'directive:95\/46') {
    return /95\/46|personuppgiftsdirektiv|dataskyddsdirektiv/u.test(lowerText);
  }

  return false;
}

function mergeReference(
  existing: Map<string, ProvisionEUReference>,
  value: ProvisionEUReference
): void {
  const key = `${value.id}:${value.article || ''}`;
  if (!existing.has(key)) {
    existing.set(key, value);
  }
}

/**
 * Get EU legal basis for a specific provision within a Swedish statute.
 *
 * Returns EU directives/regulations that this specific provision implements or references,
 * including article-level references.
 */
export async function getProvisionEUBasis(
  db: Database,
  input: GetProvisionEUBasisInput
): Promise<ToolResponse<GetProvisionEUBasisResult>> {
  // Validate SFS number format
  if (!input.sfs_number || !/^\d{4}:\d+$/.test(input.sfs_number)) {
    throw new Error(`Invalid SFS number format: "${input.sfs_number}". Expected format: "YYYY:NNN" (e.g., "2018:218")`);
  }

  if (!input.provision_ref || !input.provision_ref.trim()) {
    throw new Error('provision_ref is required (e.g., "1:1" or "3:5")');
  }

  // Check if provision exists
  const provision = db.prepare(`
    SELECT id, content
    FROM legal_provisions
    WHERE document_id = ? AND provision_ref = ?
  `).get(input.sfs_number, input.provision_ref) as
    | { id: number; content: string }
    | undefined;

  if (!provision) {
    throw new Error(
      `Provision ${input.sfs_number} ${input.provision_ref} not found in database`
    );
  }

  // Get EU references for this provision
  const sql = `
    SELECT
      ed.id,
      ed.type,
      ed.title,
      ed.short_name,
      er.eu_article,
      er.reference_type,
      er.full_citation,
      er.reference_context
    FROM eu_documents ed
    JOIN eu_references er ON ed.id = er.eu_document_id
    WHERE er.provision_id = ?
    ORDER BY
      CASE er.reference_type
        WHEN 'implements' THEN 1
        WHEN 'supplements' THEN 2
        WHEN 'cites_article' THEN 3
        ELSE 4
      END,
      ed.year DESC
  `;

  interface QueryRow {
    id: string;
    type: 'directive' | 'regulation';
    title: string | null;
    short_name: string | null;
    eu_article: string | null;
    reference_type: string;
    full_citation: string | null;
    reference_context: string | null;
  }

  const rows = db.prepare(sql).all(provision.id) as QueryRow[];

  const mergedReferences = new Map<string, ProvisionEUReference>();

  // Start with explicit provision-level references from database.
  for (const row of rows) {
    const ref: ProvisionEUReference = {
      id: row.id,
      type: row.type,
      reference_type: row.reference_type as any,
      full_citation: row.full_citation || row.id,
    };

    if (row.title) ref.title = row.title;
    if (row.short_name) ref.short_name = row.short_name;
    if (row.eu_article) ref.article = row.eu_article;
    if (row.reference_context) ref.context = row.reference_context;

    mergeReference(mergedReferences, ref);
  }

  // Build statute-level EU context (document-wide references) for inference fallback.
  const statuteEUContextRows = db.prepare(`
    SELECT
      ed.id,
      ed.type,
      ed.title,
      ed.short_name,
      CASE
        WHEN SUM(CASE WHEN er.reference_type = 'implements' THEN 1 ELSE 0 END) > 0 THEN 'implements'
        WHEN SUM(CASE WHEN er.reference_type = 'supplements' THEN 1 ELSE 0 END) > 0 THEN 'supplements'
        WHEN SUM(CASE WHEN er.reference_type = 'applies' THEN 1 ELSE 0 END) > 0 THEN 'applies'
        WHEN SUM(CASE WHEN er.reference_type = 'cites_article' THEN 1 ELSE 0 END) > 0 THEN 'cites_article'
        ELSE 'references'
      END AS reference_type,
      MAX(er.is_primary_implementation) AS is_primary_implementation
    FROM eu_references er
    JOIN eu_documents ed ON ed.id = er.eu_document_id
    WHERE er.document_id = ?
    GROUP BY ed.id, ed.type, ed.title, ed.short_name
    ORDER BY MAX(er.is_primary_implementation) DESC, ed.id
  `).all(input.sfs_number) as StatuteEUContextRow[];

  const statuteEUById = new Map<string, StatuteEUContextRow>(
    statuteEUContextRows.map(row => [row.id, row])
  );

  if (rows.length === 0) {
    // Parse inline EU references directly from provision text when provision-level rows are missing.
    const parsedInlineRefs = extractEUReferences(provision.content).filter(
      parsed => !!parsed.article && parsed.article.trim().length > 0
    );
    for (const parsed of parsedInlineRefs) {
      const euDocumentId = generateEUDocumentId(parsed);
      const fallbackDoc = statuteEUById.get(euDocumentId);

      const ref: ProvisionEUReference = {
        id: euDocumentId,
        type: parsed.type,
        reference_type: 'cites_article',
        full_citation: parsed.fullText || fallbackDoc?.short_name || euDocumentId,
      };

      if (fallbackDoc?.title) ref.title = fallbackDoc.title;
      if (fallbackDoc?.short_name) ref.short_name = fallbackDoc.short_name;
      if (parsed.article) ref.article = parsed.article;
      if (parsed.context) ref.context = parsed.context.substring(0, 200);

      mergeReference(mergedReferences, ref);
    }

    // If parser didn't link an EU document, infer from inline article mentions and statute-level context.
    if (parsedInlineRefs.length === 0) {
      const inlineArticles = extractInlineEUArticleReferences(provision.content);
      if (inlineArticles.length > 0) {
        let inferredDocs = statuteEUContextRows.filter(row =>
          matchesKnownEUDocumentAlias(provision.content, row)
        );

        if (inferredDocs.length === 0 && statuteEUContextRows.length === 1) {
          inferredDocs = [statuteEUContextRows[0]];
        }

        const mergedArticle = inlineArticles.join(',');
        for (const doc of inferredDocs) {
          const ref: ProvisionEUReference = {
            id: doc.id,
            type: doc.type,
            reference_type: 'cites_article',
            full_citation: `${doc.short_name || doc.id} Article ${mergedArticle}`,
            article: mergedArticle,
            context: provision.content.substring(0, 200),
          };

          if (doc.title) ref.title = doc.title;
          if (doc.short_name) ref.short_name = doc.short_name;

          mergeReference(mergedReferences, ref);
        }
      }
    }
  }

  const euReferences = Array.from(mergedReferences.values());

  const result: GetProvisionEUBasisResult = {
    sfs_number: input.sfs_number,
    provision_ref: input.provision_ref,
    provision_content: provision.content,
    eu_references: euReferences,
  };

  return {
    results: result,
    _metadata: generateResponseMetadata(db),
  };
}
