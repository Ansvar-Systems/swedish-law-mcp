/**
 * check_currency — Check if a statute or provision is current (in force).
 */

import type { Database } from 'better-sqlite3';
import { extractRepealDateFromDescription, normalizeAsOfDate } from '../utils/as-of-date.js';

export interface CheckCurrencyInput {
  document_id: string;
  provision_ref?: string;
  as_of_date?: string;
}

export interface CurrencyResult {
  document_id: string;
  title: string;
  status: string;
  type: string;
  issued_date: string | null;
  in_force_date: string | null;
  last_updated: string | null;
  is_current: boolean;
  as_of_date?: string;
  status_as_of?: 'in_force' | 'repealed' | 'not_yet_in_force';
  is_in_force_as_of?: boolean;
  provision_exists?: boolean;
  warnings: string[];
}

interface DocumentRow {
  id: string;
  title: string;
  status: string;
  type: string;
  issued_date: string | null;
  in_force_date: string | null;
  description: string | null;
  last_updated: string | null;
}

export async function checkCurrency(
  db: Database,
  input: CheckCurrencyInput
): Promise<CurrencyResult | null> {
  if (!input.document_id) {
    throw new Error('document_id is required');
  }

  const doc = db.prepare(`
    SELECT id, title, status, type, issued_date, in_force_date, description, last_updated
    FROM legal_documents
    WHERE id = ?
  `).get(input.document_id) as DocumentRow | undefined;

  if (!doc) {
    return null;
  }

  const warnings: string[] = [];
  const isCurrent = doc.status === 'in_force';
  const asOfDate = normalizeAsOfDate(input.as_of_date);
  const repealDate = extractRepealDateFromDescription(doc.description ?? null);

  if (doc.status === 'repealed') {
    warnings.push('This statute has been repealed (upphävd)');
  } else if (doc.status === 'amended') {
    warnings.push('This statute has been amended since last ingestion');
  } else if (doc.status === 'not_yet_in_force') {
    warnings.push('This statute has not yet entered into force');
  }

  let statusAsOf: 'in_force' | 'repealed' | 'not_yet_in_force' | undefined;
  let isInForceAsOf: boolean | undefined;
  if (asOfDate) {
    const validFrom = doc.in_force_date ?? doc.issued_date;
    const started = validFrom == null || validFrom <= asOfDate;
    const ended = repealDate != null && repealDate <= asOfDate;
    statusAsOf = !started ? 'not_yet_in_force' : ended ? 'repealed' : 'in_force';
    isInForceAsOf = statusAsOf === 'in_force';
    warnings.push(
      'Historical lookups use provision validity windows where available; some statutes only have current consolidated wording.'
    );
  }

  let provisionExists: boolean | undefined;
  if (input.provision_ref) {
    const prov = asOfDate
      ? db.prepare(`
        SELECT 1
        FROM legal_provision_versions
        WHERE document_id = ?
          AND provision_ref = ?
          AND (valid_from IS NULL OR valid_from <= ?)
          AND (valid_to IS NULL OR valid_to > ?)
        LIMIT 1
      `).get(input.document_id, input.provision_ref, asOfDate, asOfDate)
      : db.prepare(
        'SELECT 1 FROM legal_provisions WHERE document_id = ? AND provision_ref = ?'
      ).get(input.document_id, input.provision_ref);
    provisionExists = !!prov;

    if (!provisionExists) {
      warnings.push(`Provision "${input.provision_ref}" not found in this document`);
    }
  }

  return {
    document_id: doc.id,
    title: doc.title,
    status: doc.status,
    type: doc.type,
    issued_date: doc.issued_date,
    in_force_date: doc.in_force_date,
    last_updated: doc.last_updated,
    is_current: isCurrent,
    as_of_date: asOfDate,
    status_as_of: statusAsOf,
    is_in_force_as_of: isInForceAsOf,
    provision_exists: provisionExists,
    warnings,
  };
}
