/**
 * Tool registry for Swedish Legal Citation MCP Server.
 * Shared between stdio (index.ts) and HTTP (api/mcp.ts) entry points.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';

import { searchLegislation, SearchLegislationInput } from './search-legislation.js';
import { getProvision, GetProvisionInput } from './get-provision.js';
import { searchCaseLaw, SearchCaseLawInput } from './search-case-law.js';
import { getPreparatoryWorks, GetPreparatoryWorksInput } from './get-preparatory-works.js';
import { validateCitationTool, ValidateCitationInput } from './validate-citation.js';
import { buildLegalStance, BuildLegalStanceInput } from './build-legal-stance.js';
import { formatCitationTool, FormatCitationInput } from './format-citation.js';
import { checkCurrency, CheckCurrencyInput } from './check-currency.js';
import { getEUBasis, GetEUBasisInput } from './get-eu-basis.js';
import { getSwedishImplementations, GetSwedishImplementationsInput } from './get-swedish-implementations.js';
import { searchEUImplementations, SearchEUImplementationsInput } from './search-eu-implementations.js';
import { getProvisionEUBasis, GetProvisionEUBasisInput } from './get-provision-eu-basis.js';
import { validateEUCompliance, ValidateEUComplianceInput } from './validate-eu-compliance.js';
import { getAbout, type AboutContext } from './about.js';
import { listSources } from './list-sources.js';
import {
  getProvisionHistory,
  diffProvision,
  getRecentChanges,
  type GetProvisionHistoryInput,
  type DiffProvisionInput,
  type GetRecentChangesInput,
} from './version-tracking.js';
import { detectCapabilities, upgradeMessage, type Capability } from '../capabilities.js';
export type { AboutContext } from './about.js';

/**
 * Tools that benefit from professional-tier data.
 * On free tier, these tools still work but return a _tier_notice explaining limited coverage.
 */
const TIER_SENSITIVE_TOOLS: Record<string, { capability: Capability; feature: string }> = {
  search_case_law: { capability: 'expanded_case_law', feature: 'Full case law archive (4,800+ decisions)' },
  get_preparatory_works: { capability: 'full_preparatory_works', feature: 'Full preparatory works archive' },
  build_legal_stance: { capability: 'expanded_case_law', feature: 'Full case law and preparatory works' },
};

const LIST_SOURCES_TOOL: Tool = {
  name: 'list_sources',
  description: `List all data sources used by this MCP server with provenance metadata.

Returns jurisdiction, source authorities, URLs, retrieval methods, update frequencies, licenses, coverage scope, and known limitations. Use this to understand where the data comes from and how current it is. For server statistics, use about instead.`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

const ABOUT_TOOL: Tool = {
  name: 'about',
  description:
    'Server metadata, dataset statistics, freshness, and provenance. ' +
    'Call this to verify data coverage, currency, and content basis before relying on results.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description: `Search Swedish statutes and regulations by keyword. FTS5 with BM25 ranking. Do NOT use for case law — use search_case_law instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Search query in Swedish or English. Supports FTS5 syntax.' },
        document_id: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'Filter by SFS number (e.g., "2018:218")' },
        status: { type: 'string', enum: ['in_force', 'amended', 'repealed'], description: 'Filter by document status' },
        as_of_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Historical date filter (YYYY-MM-DD).' },
        limit: { type: 'number', default: 10, minimum: 1, maximum: 50, description: 'Maximum results to return' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description: `Retrieve a specific provision from a Swedish statute. Do NOT use for keyword search — use search_legislation instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'SFS number (e.g., "2018:218")' },
        chapter: { type: 'string', description: 'Chapter number (e.g., "3").' },
        section: { type: 'string', description: 'Section number (e.g., "5", "5 a")' },
        provision_ref: { type: 'string', description: 'Direct provision reference (e.g., "3:5"). Alternative to chapter+section.' },
        as_of_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Historical date (YYYY-MM-DD).' },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'search_case_law',
    description: `Search Swedish court decisions (rattsfall). FTS5 with BM25 ranking. Coverage depends on dataset tier — call 'about' to check actual case law count. Courts: HD, HFD, AD, RH, MÖD, MIG. Source: lagen.nu (CC-BY Domstolsverket). Do NOT use for statutes — use search_legislation instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Search query for case law summaries' },
        court: { type: 'string', enum: ['HD', 'HFD', 'AD', 'RH', 'MÖD', 'MIG', 'PMÖD'], description: 'Filter by court code' },
        date_from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Start date filter (YYYY-MM-DD)' },
        date_to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'End date filter (YYYY-MM-DD)' },
        limit: { type: 'number', default: 10, minimum: 1, maximum: 50, description: 'Maximum results to return' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_preparatory_works',
    description: `Get preparatory works (forarbeten) for a Swedish statute. Returns linked propositions, SOUs, and Ds documents. Coverage depends on dataset tier — call 'about' to check.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'SFS number of the statute (e.g., "2018:218")' },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'validate_citation',
    description: `Validate a Swedish legal citation against the database. Zero-hallucination enforcer. Do NOT use for formatting — use format_citation instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', minLength: 1, description: 'Citation string to validate (e.g., "SFS 2018:218 1 kap. 1 §")' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description: `Build comprehensive citations for a legal question. Searches statutes, case law, and preparatory works simultaneously. Case law and preparatory works coverage depends on dataset tier — call 'about' to check. Do NOT use for a single known statute — use get_provision + get_preparatory_works instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Legal question or topic to research' },
        document_id: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'Limit statute search to one SFS document' },
        include_case_law: { type: 'boolean', default: true, description: 'Include case law results' },
        include_preparatory_works: { type: 'boolean', default: true, description: 'Include preparatory works results' },
        as_of_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Historical date (YYYY-MM-DD).' },
        limit: { type: 'number', default: 5, minimum: 1, maximum: 20, description: 'Max results per category' },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description: `Format a Swedish legal citation (full, short, or pinpoint). Do NOT use to verify existence — use validate_citation instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', minLength: 1, description: 'Citation string to format (e.g., "2018:218 3:5")' },
        format: { type: 'string', enum: ['full', 'short', 'pinpoint'], default: 'full', description: 'Output format' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description: `Check if a Swedish statute or provision is in force (current or historical). Use before citing to verify statute hasn't been repealed.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'SFS number (e.g., "2018:218")' },
        provision_ref: { type: 'string', description: 'Provision reference to check (e.g., "3:5")' },
        as_of_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Historical date (YYYY-MM-DD).' },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_eu_basis',
    description: `Get EU legal basis for a Swedish statute. For provision-level, use get_provision_eu_basis. For reverse lookup (EU → Swedish), use get_swedish_implementations.`,
    inputSchema: {
      type: 'object',
      properties: {
        sfs_number: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'SFS number (e.g., "2018:218")' },
        include_articles: { type: 'boolean', default: false, description: 'Include specific EU article references' },
        reference_types: { type: 'array', items: { type: 'string', enum: ['implements', 'supplements', 'applies', 'references', 'transposes'] }, description: 'Filter by reference type' },
      },
      required: ['sfs_number'],
    },
  },
  {
    name: 'get_swedish_implementations',
    description: `Find Swedish statutes implementing a specific EU directive or regulation. For reverse (Swedish → EU), use get_eu_basis.`,
    inputSchema: {
      type: 'object',
      properties: {
        eu_document_id: { type: 'string', description: 'EU document ID (e.g., "regulation:2016/679", "directive:95/46")' },
        primary_only: { type: 'boolean', default: false, description: 'Return only primary implementing statutes' },
        in_force_only: { type: 'boolean', default: false, description: 'Return only in-force statutes' },
      },
      required: ['eu_document_id'],
    },
  },
  {
    name: 'search_eu_implementations',
    description: `Search EU directives/regulations with Swedish implementation info. Use get_swedish_implementations for specific EU document details.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Keyword search (title, short name, CELEX, description)' },
        type: { type: 'string', enum: ['directive', 'regulation'], description: 'Filter by document type' },
        year_from: { type: 'number', minimum: 1950, description: 'Filter by year (from)' },
        year_to: { type: 'number', maximum: 2030, description: 'Filter by year (to)' },
        community: { type: 'string', enum: ['EU', 'EG', 'EEG', 'Euratom'], description: 'Filter by EU community' },
        has_swedish_implementation: { type: 'boolean', description: 'Only return EU documents with Swedish implementations' },
        limit: { type: 'number', default: 20, minimum: 1, maximum: 100, description: 'Maximum results to return' },
      },
    },
  },
  {
    name: 'get_provision_eu_basis',
    description: `Get EU legal basis for a specific provision. For statute-level EU references, use get_eu_basis instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        sfs_number: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'SFS number (e.g., "2018:218")' },
        provision_ref: { type: 'string', minLength: 1, description: 'Provision reference (e.g., "1:1" or "3:5")' },
      },
      required: ['sfs_number', 'provision_ref'],
    },
  },
  {
    name: 'validate_eu_compliance',
    description: `Validate EU compliance status for a Swedish statute or provision. Phase 1: checks reference validity, not substantive compliance.`,
    inputSchema: {
      type: 'object',
      properties: {
        sfs_number: { type: 'string', pattern: '^\\d{4}:\\d+$', description: 'SFS number (e.g., "2018:218")' },
        provision_ref: { type: 'string', description: 'Provision reference (e.g., "1:1")' },
        eu_document_id: { type: 'string', description: 'Check compliance with specific EU document (e.g., "regulation:2016/679")' },
      },
      required: ['sfs_number'],
    },
  },
  // ── Premium tools (version tracking) ──────────────────────────────────────
  {
    name: 'get_provision_history',
    description:
      'Returns the full version timeline for a specific provision of a Swedish statute. ' +
      'Shows all historical versions with validity dates. ' +
      'Premium feature — requires Ansvar Intelligence Portal.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SFS number (e.g., "2018:218") or statute title',
        },
        provision_ref: {
          type: 'string',
          description: 'Provision reference (e.g., "1:1", "3:2")',
        },
      },
      required: ['document_id', 'provision_ref'],
    },
  },
  {
    name: 'diff_provision',
    description:
      'Shows what changed in a Swedish statute provision between two dates. ' +
      'Returns a unified diff and change summary. ' +
      'Premium feature — requires Ansvar Intelligence Portal.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SFS number (e.g., "2018:218") or statute title',
        },
        provision_ref: {
          type: 'string',
          description: 'Provision reference (e.g., "1:1", "3:2")',
        },
        from_date: {
          type: 'string',
          description: 'Start date in ISO format (e.g., "2018-05-25")',
        },
        to_date: {
          type: 'string',
          description: 'End date in ISO format (defaults to today)',
        },
      },
      required: ['document_id', 'provision_ref', 'from_date'],
    },
  },
  {
    name: 'get_recent_changes',
    description:
      'Lists all Swedish statute provisions that changed since a given date. ' +
      'Useful for regulatory change monitoring. ' +
      'Premium feature — requires Ansvar Intelligence Portal.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'ISO date to look back from (e.g., "2024-01-01")',
        },
        document_id: {
          type: 'string',
          description: 'Optional: filter to a specific statute by SFS number',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 50, max: 200)',
          default: 50,
        },
      },
      required: ['since'],
    },
  },
];

export function buildTools(context?: AboutContext): Tool[] {
  return context ? [...TOOLS, LIST_SOURCES_TOOL, ABOUT_TOOL] : [...TOOLS, LIST_SOURCES_TOOL];
}

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
  context?: AboutContext,
): void {
  const allTools = buildTools(context);
  const capabilities = detectCapabilities(db);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(db, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(db, args as unknown as GetProvisionInput);
          break;
        case 'search_case_law':
          result = await searchCaseLaw(db, args as unknown as SearchCaseLawInput);
          break;
        case 'get_preparatory_works':
          result = await getPreparatoryWorks(db, args as unknown as GetPreparatoryWorksInput);
          break;
        case 'validate_citation':
          result = await validateCitationTool(db, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(db, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput);
          break;
        case 'check_currency':
          result = await checkCurrency(db, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(db, args as unknown as GetEUBasisInput);
          break;
        case 'get_swedish_implementations':
          result = await getSwedishImplementations(db, args as unknown as GetSwedishImplementationsInput);
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(db, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(db, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(db, args as unknown as ValidateEUComplianceInput);
          break;
        case 'get_provision_history':
          result = await getProvisionHistory(db, args as unknown as GetProvisionHistoryInput);
          break;
        case 'diff_provision':
          result = await diffProvision(db, args as unknown as DiffProvisionInput);
          break;
        case 'get_recent_changes':
          result = await getRecentChanges(db, args as unknown as GetRecentChangesInput);
          break;
        case 'list_sources':
          result = listSources(db);
          break;
        case 'about':
          if (context) {
            result = getAbout(db, context);
          } else {
            return {
              content: [{ type: 'text', text: 'About tool not configured.' }],
              isError: true,
            };
          }
          break;
        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      // Inject tier notice for premium-gated tools on free tier
      const tierInfo = TIER_SENSITIVE_TOOLS[name];
      if (tierInfo && !capabilities.has(tierInfo.capability)) {
        const notice = upgradeMessage(tierInfo.feature);
        if (Array.isArray(result)) {
          result = { results: result, _tier_notice: notice };
        } else if (result && typeof result === 'object') {
          (result as Record<string, unknown>)._tier_notice = notice;
        } else {
          result = { value: result, _tier_notice: notice };
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error executing ${name}: ${message}` }],
        isError: true,
      };
    }
  });
}
