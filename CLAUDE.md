# CLAUDE.md

> Instructions for Claude Code when working on Swedish Law MCP

## Project Overview

This is an MCP server providing Swedish legal citation tools — searching statutes, case law, preparatory works, and validating citations. Built with TypeScript and SQLite FTS5 for full-text search.

**Core constraint: Zero hallucination** — the server NEVER generates citations, only returns verified database entries.

**Data Sources:**
- Riksdagen (Swedish Parliament) legal database
- Svensk Forfattningssamling (SFS) - Swedish Code of Statutes

## Architecture

```
src/
├── index.ts                 # MCP server entry point (stdio transport)
├── types/
│   ├── index.ts             # Re-exports all types
│   ├── documents.ts         # LegalDocument, DocumentType, DocumentStatus
│   ├── provisions.ts        # LegalProvision, ProvisionRef, CrossReference
│   └── citations.ts         # ParsedCitation, CitationFormat, ValidationResult
├── citation/
│   ├── parser.ts            # Parse citation strings (SFS, Prop., SOU, NJA, etc.)
│   ├── formatter.ts         # Format citations per Swedish conventions
│   └── validator.ts         # Validate citations against database
├── parsers/
│   ├── provision-parser.ts  # Parse raw statute text into provisions
│   └── cross-ref-extractor.ts  # Extract cross-references from text
└── tools/
    ├── search-legislation.ts    # search_legislation - FTS5 provision search
    ├── get-provision.ts         # get_provision - Retrieve specific provision
    ├── search-case-law.ts       # search_case_law - FTS5 case law search
    ├── get-preparatory-works.ts # get_preparatory_works - Linked forarbeten
    ├── validate-citation.ts     # validate_citation - Zero-hallucination check
    ├── build-legal-stance.ts    # build_legal_stance - Multi-source aggregation
    ├── format-citation.ts       # format_citation - Citation formatting
    └── check-currency.ts        # check_currency - Is statute in force?

scripts/
├── build-db.ts              # Build SQLite database from seed files
├── ingest-riksdagen.ts      # Ingest statutes from Riksdagen API
└── check-updates.ts         # Check for statute amendments

tests/
├── fixtures/test-db.ts      # In-memory SQLite with Swedish law sample data
├── citation/                # Parser, formatter, validator tests
├── parsers/                 # Provision parser tests
└── tools/                   # Tool-level integration tests

data/
├── seed/                    # JSON seed files per document
└── database.db              # SQLite database
```

## MCP Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 search on provision text with BM25 ranking |
| `get_provision` | Retrieve specific provision by SFS + chapter/section |
| `search_case_law` | FTS5 search on case law with court/date filters |
| `get_preparatory_works` | Get linked propositions and SOUs for a statute |
| `validate_citation` | Validate citation against database (zero-hallucination) |
| `build_legal_stance` | Aggregate citations from statutes, case law, prep works |
| `format_citation` | Format citations (full/short/pinpoint) |
| `check_currency` | Check if statute is in force, amended, or repealed |

## Swedish Law Structure

Swedish statutes follow this structure:
- **SFS number**: e.g., "2018:218" (year:sequence)
- **Chapters** (Kapitel): Major divisions, e.g., "3 kap."
- **Sections** (Paragrafer): Individual provisions, marked with §
- **Paragraphs** (Stycken): Within sections

Citation formats:
- Full: `SFS 2018:218 3 kap. 5 §`
- Short: `2018:218 3:5`
- Pinpoint: `3 kap. 5 §`
- Proposition: `Prop. 2017/18:105`
- SOU: `SOU 2017:39`
- Case law: `NJA 2020 s. 45`, `HFD 2019 ref. 12`

## Key Commands

```bash
# Development
npm run dev              # Run server with hot reload
npm run build            # Compile TypeScript
npm test                 # Run tests (vitest)

# Data Management
npm run ingest -- <sfs-number> <output.json>  # Ingest statute from Riksdagen
npm run build:db                               # Rebuild database from seed/
npm run check-updates                          # Check for amendments

# Testing
npx @anthropic/mcp-inspector node dist/index.js
```

## Database Schema

```sql
-- All legal documents (statutes, bills, SOUs, case law)
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,          -- SFS number or doc ID
  type TEXT NOT NULL,           -- statute|bill|sou|ds|case_law
  title TEXT NOT NULL,
  title_en TEXT,
  short_name TEXT,              -- e.g., "DSL", "BrB"
  status TEXT NOT NULL,         -- in_force|amended|repealed|not_yet_in_force
  issued_date TEXT,
  in_force_date TEXT,
  url TEXT,
  description TEXT,
  last_updated TEXT
);

-- Individual provisions from statutes
CREATE TABLE legal_provisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,  -- e.g., "3:5" or "5 a"
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,                -- JSON
  UNIQUE(document_id, provision_ref)
);

-- FTS5 indexes (content-synced with triggers)
CREATE VIRTUAL TABLE provisions_fts USING fts5(...);
CREATE VIRTUAL TABLE case_law_fts USING fts5(...);
CREATE VIRTUAL TABLE prep_works_fts USING fts5(...);
CREATE VIRTUAL TABLE definitions_fts USING fts5(...);

-- Case law, preparatory works, cross-references, definitions
-- See scripts/build-db.ts for full schema
```

## Testing

Tests use in-memory SQLite with sample Swedish law data:

```typescript
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('search_legislation', () => {
  let db: Database;
  beforeAll(() => { db = createTestDatabase(); });
  afterAll(() => { closeTestDatabase(db); });

  it('should find dataskydd provisions', async () => {
    const result = await searchLegislation(db, { query: 'personuppgifter' });
    expect(result.length).toBeGreaterThan(0);
  });
});
```

Sample data includes: DSL (2018:218), PUL (1998:204), 2 court decisions, 2 preparatory works, definitions, and cross-references.

## Priority Statutes

1. **Dataskyddslagen (2018:218)** - Swedish GDPR implementation
2. **Offentlighets- och sekretesslagen (2009:400)** - Public access/secrecy
3. **Arbetsmiljolagen (1977:1160)** - Workplace safety
4. **Brottsbalken (1962:700)** - Criminal code
5. **Personuppgiftslagen (1998:204)** - Personal data (historical, repealed)

## Ingestion from Riksdagen

API endpoints:
- Document list: `https://data.riksdagen.se/dokumentlista/?doktyp=sfs&format=json`
- Document content: `https://data.riksdagen.se/dokument/{id}.json`

Rate limit: 0.5s between requests.

## Resources

- [Riksdagen Open Data](https://data.riksdagen.se/)
- [Svensk Forfattningssamling](https://svenskforfattningssamling.se/)
- [Lagrummet](https://lagrummet.se/) - Legal information system
