/**
 * Citation metadata for the deterministic citation pipeline.
 *
 * Provides structured identifiers (canonical_ref, display_text, aliases)
 * that the platform's entity linker uses to match references in agent
 * responses to MCP tool results — without relying on LLM formatting.
 *
 * See: docs/guides/law-mcp-golden-standard.md Section 4.9c
 */

export interface CitationMetadata {
  canonical_ref: string;
  display_text: string;
  aliases?: string[];
  source_url?: string;
  lookup: {
    tool: string;
    args: Record<string, string>;
  };
}

/**
 * Build citation metadata for a get_provision response.
 *
 * @param documentId     DB identifier (e.g., "2018:218")
 * @param documentTitle  Human-readable law title (e.g., "Lag med kompletterande bestämmelser...")
 * @param provisionRef   Provision reference (e.g., "34" or "3:12")
 * @param inputDocId     The document_id argument as passed by the caller (e.g., "sfs-2018-218")
 * @param inputSection   The section argument as passed by the caller (e.g., "art-34")
 * @param sourceUrl      Official portal URL for this law (optional)
 * @param shortName      Short name / alias (e.g., "DSL") (optional)
 */
export function buildProvisionCitation(
  documentId: string,
  documentTitle: string,
  provisionRef: string,
  inputDocId: string,
  inputSection: string,
  sourceUrl?: string | null,
  shortName?: string | null,
): CitationMetadata {
  // Build canonical_ref from the SFS number format
  // DB id "2018:218" -> "SFS 2018:218" (Swedish statute format)
  const canonicalRef = documentId.match(/^\d{4}:\d+$/)
    ? `SFS ${documentId}`
    : documentTitle;

  // Build display_text
  const sectionLabel = provisionRef.includes(':')
    ? `${provisionRef.split(':')[0]} kap. ${provisionRef.split(':')[1]} §`
    : `${provisionRef} §`;
  const displayText = `${sectionLabel} ${canonicalRef}`;

  // Build aliases from document title and short name
  const aliases: string[] = [];
  if (shortName) aliases.push(shortName);
  // Add the raw document_id as an alias (matches argument-derived patterns)
  if (documentId !== canonicalRef) aliases.push(documentId);

  return {
    canonical_ref: canonicalRef,
    display_text: displayText,
    ...(aliases.length > 0 && { aliases }),
    ...(sourceUrl && { source_url: sourceUrl }),
    lookup: {
      tool: 'get_provision',
      args: { document_id: inputDocId, section: inputSection },
    },
  };
}
