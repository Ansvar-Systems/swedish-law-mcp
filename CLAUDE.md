# CLAUDE.md

> Instructions for Claude Code when working on Swedish Law MCP

## Project Overview

This is an MCP server providing access to Swedish statutes and regulations. Built with TypeScript and SQLite FTS5 for full-text search.

**Data Sources:**
- Riksdagen (Swedish Parliament) legal database
- Svensk Forfattningssamling (SFS) - Swedish Code of Statutes

## Architecture

```
src/
├── index.ts           # MCP server entry point (stdio transport)
└── tools/
    ├── search.ts      # search_laws - Full-text search
    ├── get-item.ts    # get_section - Retrieve specific section
    ├── list.ts        # list_statutes - List available laws
    └── definitions.ts # get_definitions - Look up terms

scripts/
├── build-db.ts        # Build SQLite database from seed files
├── ingest-source.ts   # Ingest statutes from Riksdagen
└── check-updates.ts   # Check for statute updates

data/
├── seed/              # JSON seed files for each statute
└── database.db        # SQLite database
```

## Swedish Law Structure

Swedish statutes follow this structure:
- **SFS number**: e.g., "2018:218" (year:sequence)
- **Chapters** (Kapitel): Major divisions
- **Sections** (Paragrafer): Individual provisions, marked with §
- **Paragraphs** (Stycken): Within sections

Example: SFS 2018:218 Kap. 3 § 5 = Chapter 3, Section 5 of statute 2018:218

## Key Commands

```bash
# Development
npm run dev              # Run server with hot reload
npm run build            # Compile TypeScript
npm test                 # Run tests

# Data Management
npm run ingest -- <sfs-number> <output.json>  # Ingest a statute
npm run build:db                               # Rebuild database
npm run check-updates                          # Check for updates

# Testing
npx @anthropic/mcp-inspector node dist/index.js
```

## Database Schema

```sql
-- Statutes (lagar)
CREATE TABLE sources (
  id TEXT PRIMARY KEY,        -- SFS number, e.g., "2018:218"
  name TEXT NOT NULL,         -- Swedish title
  name_en TEXT,               -- English title (if available)
  description TEXT,
  url TEXT,                   -- Link to Riksdagen
  last_updated TEXT
);

-- Sections (paragrafer)
CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL,    -- SFS number
  item_id TEXT NOT NULL,      -- e.g., "3:5" for Kap 3 § 5
  chapter TEXT,               -- Chapter number
  section TEXT,               -- Section number
  title TEXT,
  content TEXT NOT NULL,      -- Full text in Swedish
  metadata TEXT,              -- JSON: rubrik, stycken, etc.
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Full-text search
CREATE VIRTUAL TABLE items_fts USING fts5(
  content, title,
  content='items',
  content_rowid='id'
);

-- Definitions (definitioner)
CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL,
  term TEXT NOT NULL,         -- Swedish term
  term_en TEXT,               -- English translation
  definition TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
```

## Ingestion from Riksdagen

Riksdagen provides APIs and data at:
- https://data.riksdagen.se/
- https://www.riksdagen.se/sv/dokument-och-lagar/

Key API endpoints:
- Document list: `https://data.riksdagen.se/dokumentlista/`
- Document content: `https://data.riksdagen.se/dokument/{id}`

## Priority Statutes

Initial focus:
1. **Dataskyddslagen (2018:218)** - Swedish GDPR implementation
2. **Offentlighets- och sekretesslagen (2009:400)** - Public access/secrecy
3. **Arbetsmiljolagen (1977:1160)** - Workplace safety
4. **Brottsbalken (1962:700)** - Criminal code
5. **Personuppgiftslagen (1998:204)** - Personal data (historical)

## Testing

Tests use in-memory SQLite with sample Swedish law data:

```typescript
import { createTestDb } from '../fixtures/test-db';

describe('search_laws', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = createTestDb();  // Has sample Swedish statutes
  });

  it('should find dataskydd sections', () => {
    const result = searchLaws(db, { query: 'personuppgift' });
    expect(result.content[0].text).toContain('dataskydd');
  });
});
```

## Resources

- [Riksdagen Open Data](https://data.riksdagen.se/)
- [Svensk Forfattningssamling](https://svenskforfattningssamling.se/)
- [Lagrummet](https://lagrummet.se/) - Legal information system
