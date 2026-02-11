/**
 * format_citation — Format a Swedish legal citation per standard conventions.
 */

import { parseCitation } from '../citation/parser.js';
import { formatCitation } from '../citation/formatter.js';
import type { CitationFormat } from '../types/index.js';

export interface FormatCitationInput {
  citation: string;
  format?: CitationFormat;
}

export interface FormatCitationResult {
  input: string;
  formatted: string;
  type: string;
  valid: boolean;
  error?: string;
}

export async function formatCitationTool(
  input: FormatCitationInput
): Promise<FormatCitationResult> {
  if (!input.citation || input.citation.trim().length === 0) {
    return { input: '', formatted: '', type: 'unknown', valid: false, error: 'Empty citation' };
  }

  const parsed = parseCitation(input.citation);

  if (!parsed.valid) {
    return {
      input: input.citation,
      formatted: input.citation,
      type: 'unknown',
      valid: false,
      error: parsed.error,
    };
  }

  const formatted = formatCitation(parsed, input.format ?? 'full');

  return {
    input: input.citation,
    formatted,
    type: parsed.type,
    valid: true,
  };
}
