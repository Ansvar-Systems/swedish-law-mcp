# Quick Start: Case Law Ingestion

## Prerequisites

1. Database exists: `npm run build:db`
2. Node.js 18+ installed
3. Network access to lagen.nu

## Step-by-Step

### 1. Test the Parser (30 seconds)

```bash
npx tsx scripts/test-lagennu-parser.ts
```

Expected output:
```
✓ Identifier: HFD-2023:1
✓ Title: Fråga om beskattning av arbetsgivaravgifter...
✓ All tests passed!
```

### 2. Test with Limited Data (1-2 minutes)

```bash
npx tsx scripts/ingest-lagennu-cases.ts --limit 10
```

Expected output:
```
Lagen.nu Case Law Ingestion
  Database: /path/to/database.db
  Limit: 10

Fetching case list from HTML feed...
  Found 1542 case IDs in feed
Processing 10 cases...
  [10/10] Processed HFD 2023:1 (inserted: 10, updated: 0, failed: 0)

Optimizing database...

═══════════════════════════════════════════════════════════════
Ingestion Complete
═══════════════════════════════════════════════════════════════
  Total fetched:  10
  Inserted:       10
  Updated:        0
  Failed:         0
  Skipped:        0
═══════════════════════════════════════════════════════════════
```

### 3. Verify Database

```bash
sqlite3 data/database.db "SELECT COUNT(*) FROM case_law"
sqlite3 data/database.db "SELECT * FROM case_law LIMIT 1"
```

### 4. Full Production Ingestion (10-20 minutes)

```bash
npx tsx scripts/ingest-lagennu-cases.ts
```

This will:
- Fetch ~1000-2000 cases from lagen.nu
- Insert into database with full metadata
- Create cross-references to cited statutes
- Log progress every 50 cases

### 5. Monitor Progress

In another terminal:
```bash
tail -f logs/ingest-lagennu.log
```

## Verification Queries

```bash
# Count cases by court
sqlite3 data/database.db "SELECT court, COUNT(*) FROM case_law GROUP BY court"

# Recent cases
sqlite3 data/database.db "
  SELECT document_id, decision_date, court 
  FROM case_law 
  WHERE decision_date IS NOT NULL 
  ORDER BY decision_date DESC 
  LIMIT 10
"

# Cases citing a specific statute (e.g., DSL 2018:218)
sqlite3 data/database.db "
  SELECT c.document_id, c.court, c.decision_date
  FROM case_law c
  JOIN cross_references x ON c.document_id = x.source_document_id
  WHERE x.target_document_id = '2018:218'
  LIMIT 10
"
```

## Troubleshooting

### Database Not Found
```bash
npm run build:db
```

### Network Timeout
```bash
# Process in smaller batches
npx tsx scripts/ingest-lagennu-cases.ts --limit 100
# Wait and run again
npx tsx scripts/ingest-lagennu-cases.ts --limit 100
```

### Check Logs
```bash
cat logs/ingest-lagennu.log | grep ERROR
```

## Integration with MCP Tools

Once ingested, case law is available via MCP tools:

### search_case_law
```json
{
  "query": "dataskydd",
  "court": "HFD",
  "from_date": "2023-01-01"
}
```

### validate_citation
```json
{
  "citation": "HFD 2023:1"
}
```

## Maintenance

### Weekly Updates
```bash
# Re-run to catch new cases
npx tsx scripts/ingest-lagennu-cases.ts
```

Existing cases are updated, new cases are inserted.

### Check Database Size
```bash
du -h data/database.db
sqlite3 data/database.db "SELECT COUNT(*) FROM case_law"
```

## Next Steps

- Set up cron job for weekly updates
- Monitor log files for failures
- Consider full-text content extraction (future)

## Documentation

- Full guide: `/Users/jeffreyvonrotz/Projects/swedish-law-mcp/docs/case-law-ingestion.md`
- Implementation summary: `/Users/jeffreyvonrotz/Projects/swedish-law-mcp/CASE_LAW_INGESTION_SUMMARY.md`
- Main script: `/Users/jeffreyvonrotz/Projects/swedish-law-mcp/scripts/ingest-lagennu-cases.ts`
