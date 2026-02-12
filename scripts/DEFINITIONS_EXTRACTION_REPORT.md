# Legal Term Definitions Extraction Report

**Date:** 2026-02-12
**Script:** `scripts/extract-definitions.ts`
**Command:** `npm run extract:definitions`

## Summary

Successfully extracted **615 legal term definitions** from **58 Swedish statutes** and populated the `definitions` table in the database.

## Extraction Methodology

### Definition Patterns Identified

The script identifies Swedish legal definitions using the following patterns:

1. **"Med X avses i denna lag/balk..."** - Most common pattern
   - Example: "Med känsliga personuppgifter avses i denna lag sådana uppgifter som..."

2. **"Med X avses..."** - General definition
   - Example: "Med företagshälsovård avses en oberoende expertresurs..."

3. **"Med X menas i denna lag/balk..."** - Alternative phrasing
   - Example: "Med minderårig menas i denna lag den som icke har fyllt aderton år."

4. **"Med X förstås i denna balk..."** - Used in older statutes
   - Example: "Med påföljd för brott förstås i denna balk straffen böter och fängelse..."

5. **"I denna lag avses med X..."** - Inverted form
   - Example: "I denna lag avses med barn en person vars pubertetsutveckling..."

### Quality Filters

The script applies several quality checks to ensure clean, usable definitions:

- **Term length:** 3-150 characters
- **Definition length:** 10-5000 characters
- **Minimum word count:** At least 3 meaningful words
- **Exclusions:**
  - References only (e.g., "se 5 §")
  - Incomplete enumerations (e.g., "i detta kapitel 1.")
  - Cross-references without content

### Text Cleaning

- Normalize whitespace
- Remove trailing provision references like "Lag (2018:218)"
- Remove redundant prefixes
- Ensure proper sentence termination

## Results by Statute

### Top 10 Statutes by Definition Count

| Statute | Title | Definitions |
|---------|-------|-------------|
| IL (1999:1229) | Inkomstskattelag | 165 |
| 2023:200 | Mervärdesskattelag | 53 |
| 2010:110 | Socialförsäkringsbalk | 36 |
| 2011:1029 | Upphandling försvars-/säkerhetsområdet | 33 |
| 2007:1091 | Offentlig upphandling | 29 |
| MB (1998:808) | Miljöbalk | 27 |
| SkL (2011:1244) | Skatteförfarandelag | 27 |
| 2016:1146 | Upphandling försörjningssektorerna | 27 |
| UL (2005:716) | Utlänningslag | 25 |
| LOU (2016:1145) | Offentlig upphandling | 23 |

### Priority Statutes Covered

- **DSL (Dataskyddslagen)**: 2 definitions
- **OSL (Offentlighets- och sekretesslagen)**: 3 definitions
- **BrB (Brottsbalken)**: 6 definitions
- **AML (Arbetsmiljölagen)**: 3 definitions
- **MB (Miljöbalken)**: 27 definitions
- **ABL (Aktiebolagslagen)**: 10 definitions

## Sample Definitions

### Dataskyddslagen (DSL)

**Känsliga personuppgifter** (3:1)
> sådana uppgifter som avses i artikel 9.1 i EU:s dataskyddsförordning.

### Brottsbalken (BrB)

**Påföljd för brott** (1:3)
> straffen böter och fängelse samt villkorlig dom, skyddstillsyn och överlämnande till särskild vård.

**Barn** (16:10 a)
> en person vars pubertetsutveckling inte är fullbordad eller som är under arton år.

**Betalningsverktyg** (9:3 c)
> skyddade verktyg, handlingar eller uppgifter som ger möjlighet att överföra pengar eller ett penningvärde.

### Arbetsmiljölagen (AML)

**Företagshälsovård** (1:6)
> en oberoende expertresurs inom områdena arbetsmiljö och rehabilitering.

**Minderårig** (3:2)
> den som icke har fyllt aderton år.

### Offentlighets- och sekretesslagen (OSL)

**Facklig förhandling inom den offentliga sektorn** (8:3)
> en sådan förhandling som rör förhållandet mellan arbetsgivare och arbetstagare och som en myndighet, en sammanslutning av kommuner eller ett statligt eller kommunalt företag ska delta i.

## Statistics

- **Total Definitions:** 615
- **Statutes with Definitions:** 58 (out of 81 statutes in database)
- **Average Term Length:** 20 characters
- **Average Definition Length:** 141 characters
- **Shortest Definition:** ~10 characters
- **Longest Definition:** ~500 characters

## Database Integration

### Table Schema

```sql
CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  term TEXT NOT NULL,
  term_en TEXT,
  definition TEXT NOT NULL,
  source_provision TEXT,
  UNIQUE(document_id, term)
);
```

### FTS5 Full-Text Search

Definitions are automatically indexed in `definitions_fts` for fast searching:

```sql
CREATE VIRTUAL TABLE definitions_fts USING fts5(
  term, definition,
  content='definitions',
  content_rowid='id',
  tokenize='unicode61'
);
```

### Sample Queries

**Find all definitions containing "personuppgifter":**
```sql
SELECT d.term, d.definition, ld.short_name
FROM definitions d
JOIN legal_documents ld ON d.document_id = ld.id
JOIN definitions_fts ON d.id = definitions_fts.rowid
WHERE definitions_fts MATCH 'personuppgifter';
```

**Get all definitions from a specific statute:**
```sql
SELECT term, definition, source_provision
FROM definitions
WHERE document_id = '2018:218'
ORDER BY source_provision;
```

## Future Improvements

1. **Enumerated Definitions**: Parse multi-item definitions (e.g., "Med X avses 1. ..., 2. ..., 3. ...")
2. **English Translations**: Add `term_en` field for bilingual support
3. **Cross-References**: Link definitions that reference other definitions
4. **Definition Validation**: Verify definitions against authoritative sources
5. **Historical Versions**: Track definition changes over time
6. **Context Extraction**: Include surrounding context for better understanding

## Usage in MCP Server

The definitions are now available through the Swedish Law MCP server and can be queried using:

- Direct database queries
- FTS5 full-text search
- Future MCP tool: `search_definitions`

This verification approach ensures all definitions are extracted from actual statute text, not AI-generated.
