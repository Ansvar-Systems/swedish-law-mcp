# Case Law Metadata and Transparency Features

This document describes the case law metadata and transparency features added to the Swedish Law MCP server.

## Overview

The MCP server now includes comprehensive transparency features for case law data, ensuring users understand the source, freshness, and coverage of legal citations.

## Features

### 1. Case Law Statistics in `check_currency`

The `check_currency` tool now includes case law metadata when available:

```json
{
  "document_id": "2018:218",
  "status": "in_force",
  ...
  "case_law_stats": {
    "last_updated": "2026-02-12T10:00:00Z",
    "total_cases": 10245,
    "source": "lagen.nu",
    "source_url": "https://lagen.nu",
    "attribution": "Case law data from lagen.nu, licensed CC-BY Domstolsverket"
  }
}
```

**Behavior:**
- Only included when `case_law_sync_metadata` table exists
- Gracefully omitted if table not found (no sync has been run)
- Provides transparency about data freshness

### 2. Attribution Metadata in `search_case_law`

All case law search results now include attribution metadata:

```json
{
  "document_id": "HFD-2023:1",
  "title": "Case title...",
  "court": "HFD",
  ...
  "_metadata": {
    "source": "lagen.nu",
    "attribution": "Data from lagen.nu, licensed CC-BY Domstolsverket"
  }
}
```

**Benefits:**
- Clear source attribution for every result
- License compliance (CC-BY Domstolsverket)
- Easy to display in UI applications

### 3. MCP Resource: `case-law-stats`

A new MCP resource provides comprehensive statistics about case law data:

**URI:** `case-law-stats://swedish-law-mcp/metadata`

**Response (when synced):**
```json
{
  "last_sync_date": "2026-02-12T10:00:00Z",
  "last_decision_date": "2026-02-10",
  "total_cases": 10245,
  "cases_by_court": {
    "HFD": 3420,
    "AD": 4231,
    "MÖD": 1892,
    "MIG": 421,
    "RH": 234,
    "NJA": 47
  },
  "source": {
    "name": "lagen.nu",
    "url": "https://lagen.nu",
    "license": "Creative Commons Attribution",
    "attribution": "Case law from lagen.nu, licensed CC-BY Domstolsverket"
  },
  "update_frequency": "weekly",
  "coverage": "1993-present (varies by court)"
}
```

**Response (no sync yet):**
```json
{
  "status": "no_data",
  "message": "No case law data has been synced yet. Run npm run sync:cases to fetch case law from lagen.nu.",
  "last_sync_date": null,
  "last_decision_date": null,
  "total_cases": 0,
  "cases_by_court": {},
  "source": {
    "name": "lagen.nu",
    "url": "https://lagen.nu",
    "license": "Creative Commons Attribution",
    "attribution": "Case law from lagen.nu, licensed CC-BY Domstolsverket"
  },
  "update_frequency": "weekly",
  "coverage": "1993-present (varies by court)"
}
```

## Usage

### Syncing Case Law Data

```bash
# Initial sync or incremental update
npm run sync:cases

# Full refresh (re-fetch all cases)
npm run sync:cases:full

# Dry run (preview what would be synced)
npm run sync:cases -- --dry-run

# JSON output for automation
npm run sync:cases -- --json
```

### Accessing Statistics via MCP

MCP clients can read the resource:

```typescript
// List available resources
const resources = await client.listResources();

// Read case law stats
const stats = await client.readResource({
  uri: 'case-law-stats://swedish-law-mcp/metadata'
});
```

## Database Schema

The sync process creates and maintains the `case_law_sync_metadata` table:

```sql
CREATE TABLE IF NOT EXISTS case_law_sync_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_date TEXT NOT NULL,
  last_decision_date TEXT,
  cases_count INTEGER,
  source TEXT DEFAULT 'lagen.nu'
);
```

## Attribution Requirements

All case law data from lagen.nu must be attributed per CC-BY license:

**Required Attribution:**
"Case law data from lagen.nu, licensed CC-BY Domstolsverket"

**Source URL:**
https://lagen.nu

**License:**
Creative Commons Attribution (CC-BY)

## Testing

Run tests to verify transparency features:

```bash
# All tests
npm test

# Integration tests specifically
npm test tests/integration/case-law-stats-resource.test.ts

# Case law search tests (includes attribution check)
npm test tests/tools/search-case-law.test.ts

# Currency check tests (includes stats check)
npm test tests/tools/check-currency.test.ts
```

## Implementation Details

### Files Modified

1. `/src/tools/check-currency.ts`
   - Added `CaseLawStats` interface
   - Updated `CurrencyResult` to include optional `case_law_stats`
   - Query sync metadata table safely (catches errors if not exists)

2. `/src/tools/search-case-law.ts`
   - Updated `CaseLawResult` interface with `_metadata` field
   - Map all results to include attribution

3. `/src/index.ts`
   - Added `ListResourcesRequestSchema` and `ReadResourceRequestSchema`
   - Enabled `resources` capability
   - Implemented resource handlers for case law stats

4. `/CLAUDE.md`
   - Added comprehensive "Case Law Data" section
   - Documented data sources, coverage, sync commands
   - Added lagen.nu to resources

### Design Decisions

1. **Graceful Degradation:** Features work even if sync hasn't been run
2. **No Breaking Changes:** Existing API contracts unchanged, only additions
3. **Zero Hallucination:** All stats come from database, never generated
4. **Attribution-First:** Every result includes source information
5. **Transparency:** Users always know data freshness and source

## Future Enhancements

Potential improvements:

- Add cache layer for stats resource (current: queries DB each time)
- Expose more granular stats (e.g., cases per year)
- Add data quality metrics (e.g., parsing success rate)
- Support filtering stats by date range
- Add notification system for stale data (e.g., >1 week old)
