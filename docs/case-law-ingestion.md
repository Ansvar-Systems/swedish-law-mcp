# Case Law Ingestion Guide

This document describes the case law ingestion process for the Swedish Law MCP server, specifically for importing case law data from lagen.nu.

## Overview

The case law ingestion script fetches Swedish case law (rättsfall) from lagen.nu's RDF dataset and imports it into the MCP server database for search and citation validation.

## Data Source

**lagen.nu** is a comprehensive Swedish legal information system maintained by Staffan Malmgren. It provides:

- Court decisions from major Swedish courts (HFD, AD, MÖD, MIG, RH, NJA)
- Structured RDF/XML metadata for each case
- Cross-references to cited statutes
- Subject classifications and keywords

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  lagen.nu HTML Feed                                             │
│  https://lagen.nu/dataset/dv/feed                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ Parse HTML
                   │ Extract case IDs
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Case ID List                                                   │
│  - HFD 2023:1                                                   │
│  - AD 2023 nr 57                                                │
│  - NJA 2020 s. 45                                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ For each case ID:
                   │ - Convert to RDF URL
                   │ - Fetch RDF/XML
                   │ - Parse metadata
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  RDF Metadata (per case)                                        │
│  - document_id (dcterms:identifier)                             │
│  - title (rpubl:referatrubrik)                                  │
│  - court (dcterms:publisher → foaf:name)                        │
│  - case_number (rpubl:malnummer)                                │
│  - decision_date (rpubl:avgorandedatum)                         │
│  - keywords (dcterms:subject → rdfs:label)                      │
│  - cited_statutes (rpubl:lagrum, dcterms:references)            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ Batch insert (100 cases/transaction)
                   │ Update FTS5 index
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  SQLite Database                                                │
│  - legal_documents (type='case_law')                            │
│  - case_law (metadata)                                          │
│  - case_law_fts (full-text search)                              │
│  - cross_references (cited statutes)                            │
└─────────────────────────────────────────────────────────────────┘
```

## Script Usage

### Initial Ingestion

For the first-time import of case law data:

```bash
# Ingest all cases from lagen.nu feed
npm run ingest:cases

# Or directly with tsx
npx tsx scripts/ingest-lagennu-cases.ts

# Ingest first 100 cases (for testing)
npx tsx scripts/ingest-lagennu-cases.ts --limit 100
```

### Incremental Sync

For updating the database with new cases only:

```bash
# Normal incremental sync (only fetch new cases)
npm run sync:cases

# Full refresh (re-process all cases)
npm run sync:cases:full

# Dry run (show what would be synced without making changes)
npx tsx scripts/sync-lagennu-cases.ts --dry-run

# JSON output for automation
npx tsx scripts/sync-lagennu-cases.ts --json
```

**Key features of sync script:**
- Tracks last sync timestamp in database
- Only fetches cases not already in database
- Updates existing cases if metadata changed
- Maintains sync metadata table for scheduling
- Supports dry-run and JSON output modes

### Prerequisites

1. Database must exist (run `npm run build:db` first)
2. Network access to lagen.nu
3. Node.js 18+ with TypeScript support

### Performance Characteristics

- **Rate limiting**: 500ms delay between requests (respects lagen.nu's server)
- **Retry logic**: 3 retries with exponential backoff on failures
- **Batch size**: 100 cases per transaction (optimizes database writes)
- **Progress reporting**: Every 50 cases processed
- **Error handling**: Individual failures don't stop the entire process

### Expected Duration

- Full corpus (~1000-2000 cases): 10-20 minutes
- Limited run (100 cases): 1-2 minutes

## RDF Data Structure

### Namespaces

The RDF documents use these XML namespaces:

- `rpubl`: https://lagen.nu/terms# (Swedish legal publishing terms)
- `dcterms`: http://purl.org/dc/terms/ (Dublin Core metadata)
- `rdf`: http://www.w3.org/1999/02/22-rdf-syntax-ns#
- `foaf`: http://xmlns.com/foaf/0.1/ (Friend of a Friend)
- `rdfs`: http://www.w3.org/2000/01/rdf-schema#

### RDF Document Types

Cases appear as either:
- `rpubl:Rattsfallsreferat` (published case law reports)
- `rpubl:VagledandeDomstolsavgorande` (precedential court decisions)

### Field Mapping

| RDF Field | Database Field | Required | Example |
|-----------|----------------|----------|---------|
| `dcterms:identifier` | `document_id` | Yes | `HFD-2023:1` |
| `rpubl:referatrubrik` | `title` | Yes | `Fråga om beskattning...` |
| `dcterms:publisher/foaf:name` | `court` | Yes | `Högsta förvaltningsdomstolen` |
| `rpubl:malnummer` | `case_number` | No | `5212-22` |
| `rpubl:avgorandedatum` | `decision_date` | No | `2023-01-18` |
| `dcterms:subject/rdfs:label` | `keywords` | No | `Skatterätt, Arbetsgivaravgifter` |
| `rpubl:lagrum` | `cited_statutes[]` | No | `2018:218` |
| `dcterms:references` | `cited_statutes[]` | No | `1999:1229` |

### Sample RDF Document

```xml
<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xmlns:rpubl="https://lagen.nu/terms#"
         xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
         xmlns:foaf="http://xmlns.com/foaf/0.1/">
  <rpubl:VagledandeDomstolsavgorande rdf:about="https://lagen.nu/dom/hfd/2023:1">
    <dcterms:identifier>HFD-2023:1</dcterms:identifier>
    <rpubl:referatrubrik>Fråga om beskattning av arbetsgivaravgifter</rpubl:referatrubrik>
    <dcterms:publisher>
      <foaf:Organization>
        <foaf:name>Högsta förvaltningsdomstolen</foaf:name>
      </foaf:Organization>
    </dcterms:publisher>
    <rpubl:malnummer>5212-22</rpubl:malnummer>
    <rpubl:avgorandedatum>2023-01-18</rpubl:avgorandedatum>
    <dcterms:subject>
      <rdf:Description>
        <rdfs:label>Skatterätt</rdfs:label>
      </rdf:Description>
    </dcterms:subject>
    <rpubl:lagrum rdf:resource="https://lagen.nu/2018:218"/>
  </rpubl:VagledandeDomstolsavgorande>
</rdf:RDF>
```

## Court Codes

The script recognizes these Swedish courts:

| Code | Full Name | English |
|------|-----------|---------|
| HFD | Högsta förvaltningsdomstolen | Supreme Administrative Court |
| AD | Arbetsdomstolen | Labour Court |
| MÖD/MMD | Marknads- och migrationsöverdomstolen | Market and Migration Court of Appeal |
| MIG | Migrationsöverdomstolen | Migration Court of Appeal (historical) |
| RH | Rättshjälpsnämnden | Legal Aid Authority |
| NJA | Nytt Juridiskt Arkiv (Högsta domstolen) | Supreme Court Reports |
| HvS | Hovrätten | Court of Appeal |

### Citation Formats

Different courts use different citation formats:

- **Standard**: `HFD 2023:1` (court year:number)
- **AD format**: `AD 2023 nr 57` (uses "nr" instead of colon)
- **Page-based**: `NJA 2020 s. 45` (page reference in yearbook)

The script normalizes all formats to `{COURT}-{YEAR}:{NUMBER}` for database storage.

## Database Schema

### Tables Updated

1. **legal_documents**
   - Stores case metadata
   - `type = 'case_law'`
   - Links to `case_law` table

2. **case_law**
   - Court-specific metadata
   - `document_id` references `legal_documents.id`
   - Includes summary and keywords

3. **case_law_fts**
   - FTS5 full-text search index
   - Auto-updated via triggers
   - Indexes: summary, keywords

4. **cross_references**
   - Links cases to cited statutes
   - `ref_type = 'references'`
   - Enables citation graph queries

5. **case_law_sync_metadata**
   - Tracks sync history for incremental updates
   - Singleton table (id = 1)
   - Fields: `last_sync_date`, `last_decision_date`, `cases_count`, `source`

## Error Handling

The script handles these error scenarios:

1. **Network failures**: Retry 3 times with exponential backoff
2. **Malformed XML**: Log error, skip case, continue processing
3. **Missing required fields**: Use fallback values (e.g., case ID as title)
4. **Database conflicts**: Update existing records instead of failing
5. **Rate limiting**: Respect 500ms delay between requests

All errors are logged to `/logs/ingest-lagennu.log` with timestamps and stack traces.

## Logging

### Log File Location

```
/Users/jeffreyvonrotz/Projects/swedish-law-mcp/logs/ingest-lagennu.log
```

### Log Format

```
[2026-02-12T10:30:45.123Z] Lagen.nu Case Law Ingestion
[2026-02-12T10:30:45.456Z]   Database: /path/to/database.db
[2026-02-12T10:30:45.789Z]   Limit: none
[2026-02-12T10:30:46.123Z] Fetching case list from HTML feed...
[2026-02-12T10:30:47.456Z]   Found 1542 case IDs in feed
[2026-02-12T10:30:47.789Z] Processing 1542 cases...
[2026-02-12T10:31:35.123Z]   [50/1542] Processed HFD 2023:1 (inserted: 48, updated: 2, failed: 0)
...
[2026-02-12T10:45:12.789Z] ═══════════════════════════════════════════════════════════════
[2026-02-12T10:45:12.789Z] Ingestion Complete
[2026-02-12T10:45:12.789Z] ═══════════════════════════════════════════════════════════════
[2026-02-12T10:45:12.789Z]   Total fetched:  1542
[2026-02-12T10:45:12.789Z]   Inserted:       1538
[2026-02-12T10:45:12.789Z]   Updated:        4
[2026-02-12T10:45:12.789Z]   Failed:         0
[2026-02-12T10:45:12.789Z]   Skipped:        0
[2026-02-12T10:45:12.789Z] ═══════════════════════════════════════════════════════════════
```

## Testing

### Parser Validation

Test RDF parsing logic before running full ingestion:

```bash
npx tsx scripts/test-lagennu-parser.ts
```

This validates:
- Case ID parsing (all formats)
- RDF field extraction
- Statute reference extraction
- Keyword aggregation

### Limited Ingestion

Test database operations with a small sample:

```bash
npx tsx scripts/ingest-lagennu-cases.ts --limit 10
```

### Database Verification

After ingestion, verify data quality:

```bash
sqlite3 data/database.db "SELECT COUNT(*) FROM case_law"
sqlite3 data/database.db "SELECT court, COUNT(*) FROM case_law GROUP BY court"
```

## Incremental Updates

Both scripts support incremental updates, but the sync script is optimized for this use case:

### Using the Sync Script (Recommended)

```bash
# Incremental sync - only new cases
npm run sync:cases

# Full refresh - reprocess everything
npm run sync:cases:full
```

**How it works:**
1. Queries `case_law_sync_metadata` for last sync timestamp
2. Checks existing case IDs in database
3. Filters feed to only new cases
4. Processes and inserts new cases
5. Updates sync metadata with timestamp and stats

### Using the Ingest Script

```bash
# Re-run full ingest (updates existing, adds new)
npm run ingest:cases
```

**Behavior:**
1. Existing cases are updated (not duplicated)
2. New cases are inserted
3. `ON CONFLICT DO UPDATE` handles duplicates gracefully

### Sync Metadata

The sync script maintains metadata in the `case_law_sync_metadata` table:

```sql
SELECT * FROM case_law_sync_metadata;
-- Returns: last_sync_date, last_decision_date, cases_count, source
```

**Example output:**
```
last_sync_date: 2026-02-12T15:30:00.000Z
last_decision_date: 2026-01-15
cases_count: 1542
source: lagen.nu
```

### Scheduling Automated Syncs

The sync script is designed for automation:

```bash
# Cron job (daily at 3 AM)
0 3 * * * cd /path/to/swedish-law-mcp && npm run sync:cases >> logs/cron.log 2>&1

# GitHub Actions (weekly)
name: Sync Case Law
on:
  schedule:
    - cron: '0 3 * * 0'  # Every Sunday at 3 AM
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run sync:cases
```

### JSON Output for Automation

```bash
npm run sync:cases -- --json > sync-report.json
```

**Report structure:**
```json
{
  "status": "success",
  "timestamp": "2026-02-12T15:30:00.000Z",
  "mode": "incremental",
  "dry_run": false,
  "stats": {
    "new_cases_added": 12,
    "cases_updated": 3,
    "cases_skipped": 0,
    "cases_failed": 0,
    "total_cases_in_db": 1554
  },
  "metadata": {
    "last_sync_date": "2026-02-12T15:30:00.000Z",
    "last_decision_date": "2026-02-01",
    "cases_count": 1554,
    "source": "lagen.nu"
  }
}
```

## Troubleshooting

### "Database not found" Error

**Cause**: Database hasn't been created yet

**Solution**:
```bash
npm run build:db
```

### Network Timeouts

**Cause**: lagen.nu server is slow or unreachable

**Solution**:
- Check network connectivity
- Wait and retry
- Use `--limit` flag for partial ingestion

### Parse Failures

**Cause**: RDF structure changed or malformed

**Solution**:
- Check logs for specific case ID
- Manually inspect RDF at `https://lagen.nu/dom/{court}/{year}:{number}.rdf`
- Report issue if systematic

### High Memory Usage

**Cause**: Processing too many cases at once

**Solution**:
- Use `--limit` flag to process in chunks
- Increase `BATCH_SIZE` constant (default: 100)

## Future Enhancements

1. ~~**Incremental sync**: Track last update date, only fetch new cases~~ ✅ Implemented
2. **Full-text content**: Extract case text from HTML, not just metadata
3. **Legal references**: Parse and link references between cases
4. **Subject taxonomy**: Build hierarchical subject classification
5. **Change tracking**: Detect and log case law updates/corrections
6. **Decision date filtering**: Use actual decision dates for smarter filtering
7. **Webhook notifications**: Alert on new precedential cases

## References

- [lagen.nu Dataset](https://lagen.nu/dataset/)
- [RDF/XML Specification](https://www.w3.org/TR/rdf-syntax-grammar/)
- [Dublin Core Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)
- [Swedish Legal Publishing Terms (rpubl)](https://lagen.nu/terms/)

## License

This ingestion script is part of the Swedish Law MCP server, licensed under Apache 2.0.
Data from lagen.nu is subject to its own license terms.
