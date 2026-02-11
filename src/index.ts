#!/usr/bin/env node
/**
 * Swedish Legal Citation MCP Server
 *
 * Provides 8 tools for querying Swedish statutes, case law,
 * preparatory works, and legal citations.
 *
 * Zero-hallucination: never generates citations, only returns verified database entries.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { searchLegislation, SearchLegislationInput } from './tools/search-legislation.js';
import { getProvision, GetProvisionInput } from './tools/get-provision.js';
import { searchCaseLaw, SearchCaseLawInput } from './tools/search-case-law.js';
import { getPreparatoryWorks, GetPreparatoryWorksInput } from './tools/get-preparatory-works.js';
import { validateCitationTool, ValidateCitationInput } from './tools/validate-citation.js';
import { buildLegalStance, BuildLegalStanceInput } from './tools/build-legal-stance.js';
import { formatCitationTool, FormatCitationInput } from './tools/format-citation.js';
import { checkCurrency, CheckCurrencyInput } from './tools/check-currency.js';

const SERVER_NAME = 'swedish-legal-citations';
const SERVER_VERSION = '0.1.0';

const DB_ENV_VAR = 'SWEDISH_LAW_DB_PATH';
const DEFAULT_DB_PATH = '../data/database.db';

// ─────────────────────────────────────────────────────────────────────────────
// Database singleton
// ─────────────────────────────────────────────────────────────────────────────

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = process.env[DB_ENV_VAR] || getDefaultDbPath();
    console.error(`[${SERVER_NAME}] Opening database: ${dbPath}`);
    dbInstance = new Database(dbPath, { readonly: true });
    dbInstance.pragma('foreign_keys = ON');
    console.error(`[${SERVER_NAME}] Database opened successfully`);
  }
  return dbInstance;
}

function getDefaultDbPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, DEFAULT_DB_PATH);
}

function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.error(`[${SERVER_NAME}] Database closed`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description: `Search Swedish statutes and regulations by keyword.

Searches provision text using FTS5 with BM25 ranking. Supports boolean operators (AND, OR, NOT), phrase search ("exact phrase"), and prefix matching (term*).

Returns matched provisions with snippets, relevance scores, and document metadata.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query in Swedish or English. Supports FTS5 syntax.',
        },
        document_id: {
          type: 'string',
          description: 'Filter to a specific statute by SFS number (e.g., "2018:218")',
        },
        status: {
          type: 'string',
          enum: ['in_force', 'amended', 'repealed'],
          description: 'Filter by document status',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10, max: 50)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description: `Retrieve a specific provision from a Swedish statute.

Specify the SFS number and either chapter+section or provision_ref directly.
Examples:
  - document_id="2018:218", chapter="1", section="1" → 1 kap. 1 § DSL
  - document_id="2018:218", provision_ref="1:1" → same result
  - document_id="1998:204", section="5 a" → 5 a § PUL (flat statute, no chapter)

Omit chapter/section/provision_ref to get all provisions in the statute.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SFS number (e.g., "2018:218")',
        },
        chapter: {
          type: 'string',
          description: 'Chapter number (e.g., "3"). Omit for flat statutes.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "5", "5 a")',
        },
        provision_ref: {
          type: 'string',
          description: 'Direct provision reference (e.g., "3:5" for Kap 3 § 5)',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'search_case_law',
    description: `Search Swedish court decisions (rattsfall).

Searches case summaries and keywords. Filter by court (HD, HFD, AD, etc.) and date range.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for case law summaries',
        },
        court: {
          type: 'string',
          description: 'Filter by court (e.g., "HD", "HFD", "AD")',
        },
        date_from: {
          type: 'string',
          description: 'Start date filter (ISO 8601, e.g., "2020-01-01")',
        },
        date_to: {
          type: 'string',
          description: 'End date filter (ISO 8601)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 10, max: 50)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_preparatory_works',
    description: `Get preparatory works (forarbeten) for a Swedish statute.

Returns linked propositions (Prop.), SOUs, and Ds documents with summaries.
Essential for understanding legislative intent behind statutory provisions.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SFS number of the statute (e.g., "2018:218")',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'validate_citation',
    description: `Validate a Swedish legal citation against the database.

Parses the citation, checks that the document and provision exist, and returns warnings about status (repealed, amended). This is the zero-hallucination enforcer.

Supported formats:
  - "SFS 2018:218 1 kap. 1 §"
  - "2018:218 1:1"
  - "Prop. 2017/18:105"
  - "SOU 2017:39"
  - "NJA 2020 s. 45"`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to validate',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description: `Build a comprehensive set of citations for a legal question.

Searches across statutes, case law, and preparatory works simultaneously to aggregate relevant citations. Use this for broad legal research questions.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Legal question or topic to research',
        },
        document_id: {
          type: 'string',
          description: 'Optionally limit statute search to one document',
        },
        include_case_law: {
          type: 'boolean',
          description: 'Include case law results (default: true)',
        },
        include_preparatory_works: {
          type: 'boolean',
          description: 'Include preparatory works results (default: true)',
        },
        limit: {
          type: 'number',
          description: 'Max results per category (default: 5, max: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description: `Format a Swedish legal citation per standard conventions.

Formats:
  - full: "SFS 2018:218 3 kap. 5 §"
  - short: "2018:218 3:5"
  - pinpoint: "3 kap. 5 §"`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to format',
        },
        format: {
          type: 'string',
          enum: ['full', 'short', 'pinpoint'],
          description: 'Output format (default: "full")',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description: `Check if a Swedish statute or provision is currently in force.

Returns the document's status (in_force, amended, repealed, not_yet_in_force), dates, and any warnings.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SFS number (e.g., "2018:218")',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional provision reference to check (e.g., "3:5")',
        },
      },
      required: ['document_id'],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Server setup
// ─────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`[${SERVER_NAME}] ListTools request received`);
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[${SERVER_NAME}] CallTool: ${name}`);

  try {
    let result: unknown;

    switch (name) {
      case 'search_legislation':
        result = await searchLegislation(getDb(), args as unknown as SearchLegislationInput);
        break;
      case 'get_provision':
        result = await getProvision(getDb(), args as unknown as GetProvisionInput);
        break;
      case 'search_case_law':
        result = await searchCaseLaw(getDb(), args as unknown as SearchCaseLawInput);
        break;
      case 'get_preparatory_works':
        result = await getPreparatoryWorks(getDb(), args as unknown as GetPreparatoryWorksInput);
        break;
      case 'validate_citation':
        result = await validateCitationTool(getDb(), args as unknown as ValidateCitationInput);
        break;
      case 'build_legal_stance':
        result = await buildLegalStance(getDb(), args as unknown as BuildLegalStanceInput);
        break;
      case 'format_citation':
        result = await formatCitationTool(args as unknown as FormatCitationInput);
        break;
      case 'check_currency':
        result = await checkCurrency(getDb(), args as unknown as CheckCurrencyInput);
        break;
      default:
        return {
          content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${SERVER_NAME}] Tool ${name} failed: ${message}`);
    return {
      content: [{ type: 'text', text: `Error executing ${name}: ${message}` }],
      isError: true,
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.error(`[${SERVER_NAME}] Starting server v${SERVER_VERSION}...`);

  const transport = new StdioServerTransport();

  process.on('SIGINT', () => {
    console.error(`[${SERVER_NAME}] Shutting down...`);
    closeDb();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error(`[${SERVER_NAME}] Shutting down...`);
    closeDb();
    process.exit(0);
  });

  await server.connect(transport);
  console.error(`[${SERVER_NAME}] Server started successfully`);
}

main().catch((error) => {
  console.error(`[${SERVER_NAME}] Fatal error:`, error);
  closeDb();
  process.exit(1);
});
