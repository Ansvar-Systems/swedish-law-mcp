# Swedish Law MCP Server

> Production-grade Swedish legal research with verified data sources

[![npm version](https://img.shields.io/npm/v/@ansvar/swedish-law-mcp)](https://www.npmjs.com/package/@ansvar/swedish-law-mcp)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

**Comprehensive Swedish legal database** with 4,827+ court decisions, 1,818 preparatory works, and 81 statutes — all verified against authoritative sources.

⚠️ **NOT LEGAL ADVICE** — Professional-grade research tool. See [DISCLAIMER.md](DISCLAIMER.md) and [PRIVACY.md](PRIVACY.md) before use.

---

## Overview

This MCP (Model Context Protocol) server provides AI assistants with direct access to Swedish law through a comprehensive local database. Query statutes, court decisions, and legislative history with data integrity checks — every citation is verified against authoritative sources.

### 🎯 Verified Data Sources

Unlike general AI models that may generate plausible-sounding but fake legal citations, this MCP **only returns data from verified Swedish legal sources**. Every statute, case, and proposition in the database has been validated against official government databases (Riksdagen, lagen.nu). While we implement rigorous verification processes, users should always validate critical citations against primary sources.

### 📊 Database Coverage

| Category | Count | Coverage |
|----------|-------|----------|
| **Court Decisions** | 4,827 cases | 6 major courts, 2011-2023 |
| **Preparatory Works** | 1,818 documents | Propositions (Prop.) and SOUs |
| **Statutes** | 81 laws | High-relevance Swedish legislation |
| **Provisions** | 16,980 sections | Full-text searchable |
| **Legal Definitions** | 615 terms | Extracted from statute text |
| **Database Size** | 37 MB | Optimized SQLite with FTS5 |

### 🏛️ Court Coverage

- **NJA** (Högsta domstolen) — Supreme Court: 1,156 cases
- **HFD** (Högsta förvaltningsdomstolen) — Supreme Administrative Court: 965 cases
- **AD** (Arbetsdomstolen) — Labour Court: 985 cases
- **RH** (Riksdagens ombudsmän) — Parliamentary Ombudsmen: 845 cases
- **MÖD** (Mark- och miljööverdomstolen) — Land & Environment Court: 567 cases
- **MIG** (Migrationsöverdomstolen) — Migration Court of Appeal: 308 cases

### ⚠️ Professional Use Notices

**Before using this tool professionally, you MUST read:**

- **[DISCLAIMER.md](DISCLAIMER.md)** — Legal disclaimers, professional liability, data limitations
- **[PRIVACY.md](PRIVACY.md)** — Client confidentiality, Advokatsamfundet compliance, on-premise deployment

**Key Limitations:**
- ❌ **Not legal advice** — Research tool only, not a substitute for professional legal counsel
- ✅ **Production-grade data** — Verified against official sources (Riksdagen, lagen.nu)
- ⚠️ **Verify critical citations** — While data is verified, always check official sources for court filings
- 🔒 **Client confidentiality** — Queries through Claude API; use on-premise for privileged matters
- 📅 **Coverage gaps** — No EU law, CJEU, or pre-2011 cases (except NJA back to 2011)

### What's Included

| Source | Description | Coverage |
|--------|-------------|----------|
| **Swedish Statutes** | Family, civil, criminal, tax, administrative, labor law | 81 laws, 16,980 provisions |
| **Case Law** | Multi-court precedents with summaries | 4,827 cases (2011-2023) |
| **Preparatory Works** | Legislative history (förarbeten) | 1,818 Prop./SOUs |
| **Legal Definitions** | Terminology extracted from statutes | 615 defined terms |

---

## Installation

### Option 1: Published Package (Recommended for Users)

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "swedish-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/swedish-law-mcp"]
    }
  }
}
```

**Note:** Published package may not include the latest database expansion. For full production data (4,827 cases), use Option 2.

### Option 2: Local Development Setup (Recommended for Full Data)

For access to the complete production database with all 4,827 court cases:

```bash
# Clone repository
git clone https://github.com/Ansvar-Systems/swedish-law-mcp
cd swedish-law-mcp

# Install dependencies
npm install

# Build the MCP server
npm run build

# Add to Claude Desktop config
# Use absolute path to your local installation
```

Claude Desktop config for local setup:

```json
{
  "mcpServers": {
    "swedish-law": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/absolute/path/to/swedish-law-mcp/dist/index.js"
      ]
    }
  }
}
```

### Cursor / VS Code

```json
{
  "mcp.servers": {
    "swedish-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/swedish-law-mcp"]
    }
  }
}
```

---

## Available Tools (8)

### 1. `search_legislation` — Full-Text Statute Search

Search across 16,980 provisions using SQLite FTS5 with BM25 ranking.

```
"Find provisions about personal data processing consent in Swedish law"
→ Returns ranked DSL provisions with exact text
```

**Parameters:**
- `query` (required) — Search terms
- `document_id` (optional) — Limit to specific statute (e.g., "2018:218")
- `chapter` (optional) — Filter by chapter
- `status` (optional) — Filter by in_force, repealed, amended
- `limit` (optional) — Max results (default: 10)

### 2. `get_provision` — Retrieve Specific Provision

Get exact provision text by SFS number and location.

```
"Get Dataskyddslagen 3 kap. 5 §"
→ Returns full text of DSL 2018:218 3:5
```

**Parameters:**
- `sfs_number` (required) — e.g., "2018:218"
- `chapter` (optional) — Chapter number
- `section` (required) — Section/paragraph reference

### 3. `search_case_law` — Multi-Court Case Search

Search 4,827 court decisions with filters by court and date.

```
"Find Labour Court cases about discrimination from 2020-2023"
→ Returns AD cases with summaries, citations, and dates
```

**Parameters:**
- `query` (required) — Search terms
- `court` (optional) — Filter by NJA, HFD, AD, RH, MÖD, MIG
- `start_date` (optional) — YYYY-MM-DD
- `end_date` (optional) — YYYY-MM-DD
- `limit` (optional) — Max results (default: 10)

### 4. `get_preparatory_works` — Legislative History

Retrieve linked propositions and SOUs for any statute.

```
"What was the government's intent behind DSL's consent requirements?"
→ Returns Prop. 2017/18:105 with explanation
```

**Parameters:**
- `sfs_number` (required) — Statute to look up

### 5. `validate_citation` — Citation Verification

Validate any Swedish legal citation against the database.

```
"Is 'NJA 2020 s. 45' a valid citation?"
→ Returns: Valid ✓, exists in database, normalized format
```

**Parameters:**
- `citation` (required) — Citation string to validate

### 6. `build_legal_stance` — Multi-Source Aggregation

Combine statutes, case law, and preparatory works for comprehensive research.

```
"Research GDPR consent requirements in Swedish law"
→ Returns: DSL provisions + HFD/NJA cases + Prop. 2017/18:105
```

**Parameters:**
- `query` (required) — Legal question
- `include_sources` (optional) — Array: ["legislation", "case_law", "preparatory_works"]

### 7. `format_citation` — Swedish Legal Formatting

Format citations per Swedish legal conventions.

```
"Format '2018:218 3:5' as full citation"
→ Returns: "SFS 2018:218 3 kap. 5 §"
```

**Parameters:**
- `citation` (required) — Citation to format
- `format` (required) — "full", "short", or "pinpoint"

### 8. `check_currency` — Law Validity Check

Check if statute is in force, amended, or repealed.

```
"Is PUL (1998:204) still in force?"
→ Returns: Repealed ❌ (replaced by DSL 2018:218 on 2018-08-01)
```

**Parameters:**
- `sfs_number` (required) — Statute to check

---

## Use Cases

### For Law Firms
- **Due diligence:** Validate citations in contracts and briefs
- **Legal research:** Find precedents across specialized courts
- **Drafting:** Ensure correct citation formatting
- **Legislative history:** Understand intent behind provisions

### For Legal Tech
- **Contract analysis:** Extract and validate legal references
- **Compliance tools:** Check if regulations are current
- **Legal Q&A:** Build legal chatbots with verified data sources
- **Citation networks:** Map relationships between laws and cases

### For Researchers
- **Academic research:** Access comprehensive Swedish legal corpus
- **Comparative law:** Compare Swedish and EU legal frameworks
- **Terminology:** Query legal definitions and usage
- **Historical analysis:** Track case law evolution (2011-2023)

---

## Data Sources

All content is sourced from authoritative Swedish legal databases:

- **[Riksdagen](https://riksdagen.se/)** — Swedish Parliament's official legal database (statutes, propositions)
- **[Svensk Forfattningssamling](https://svenskforfattningssamling.se/)** — Official statute collection
- **[Lagen.nu](https://lagen.nu)** — Curated case law database (CC-BY Domstolsverket)

### Data Freshness

- **Statutes:** Manually curated for relevance, updated as needed
- **Case Law:** Complete archive 2011-2023, supports weekly auto-sync
- **Prep Works:** Validated against Riksdagen API during ingestion

### Attribution

Case law data is provided by [lagen.nu](https://lagen.nu) under Creative Commons Attribution (CC-BY Domstolsverket). All case law results include source attribution metadata.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/swedish-law-mcp
cd swedish-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
# Start MCP server
npm run dev

# Test with MCP Inspector
npx @anthropic/mcp-inspector node dist/index.js
```

### Data Management

```bash
# Ingest new statute from Riksdagen
npm run ingest -- <sfs-number> <output.json>

# Ingest case law (full archive, all courts from 2011+)
npm run ingest:cases:full-archive

# Ingest case law (incremental sync)
npm run sync:cases

# Ingest preparatory works (validate all statute references)
npm run sync:prep-works

# Extract legal definitions from statutes
npm run extract:definitions

# Rebuild SQLite database from seed files
npm run build:db

# Check for statute amendments
npm run check-updates
```

### Database Schema

```sql
-- Core tables
legal_documents      -- All documents (statutes, bills, SOUs, cases)
legal_provisions     -- Individual statute provisions
case_law             -- Court decisions with metadata
preparatory_works    -- Legislative history documents
definitions          -- Legal term definitions
cross_references     -- Links between provisions

-- FTS5 search indexes (auto-synced)
provisions_fts       -- Full-text search on provisions
case_law_fts         -- Full-text search on case summaries
prep_works_fts       -- Full-text search on propositions
definitions_fts      -- Full-text search on definitions
```

---

## Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** 37 MB (efficient, portable)
- **Coverage:** 12+ years of case law (2011-2023)
- **Reliability:** 100% ingestion success rate (0 failures, 0 hallucinated entries)

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Additional statute coverage (currently 81 laws)
- EU law integration (CJEU, directives, regulations)
- Historical statute versions
- Cross-reference extraction improvements
- Lower court decisions (Tingsrätt, Hovrätt)

---

## Roadmap

- [ ] Weekly auto-sync for case law (via GitHub Actions)
- [ ] EU law integration (cross-reference Swedish → EU law)
- [ ] Lower court coverage (Tingsrätt, Hovrätt archives)
- [ ] Historical statute versions (amendment tracking)
- [ ] English translations for key statutes
- [ ] Web API for programmatic access

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{swedish_law_mcp_2025,
  author = {Ansvar Systems AB},
  title = {Swedish Law MCP Server: Production-Grade Legal Research Tool},
  year = {2025},
  url = {https://github.com/Ansvar-Systems/swedish-law-mcp},
  note = {Comprehensive Swedish legal database with 4,827+ court decisions}
}
```

---

## License

Apache 2.0 - see [LICENSE](LICENSE)

### Data Licenses

- **Statutes & Propositions:** Swedish Government (public domain)
- **Case Law:** CC-BY Domstolsverket (via lagen.nu)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Ansvar-Systems/swedish-law-mcp/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Ansvar-Systems/swedish-law-mcp/discussions)
- **Email:** contact@ansvar.ai

---

## About

Built by [**Ansvar Systems AB**](https://ansvar.ai) — Stockholm, Sweden

Part of the [Ansvar MCP Ecosystem](https://github.com/Ansvar-Systems):
- [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP) — EU regulations and directives
- **@ansvar/swedish-law-mcp** — Swedish law (this server)
- [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/us-regulations-mcp) — US federal regulations
- [@ansvar/ot-security-mcp](https://github.com/Ansvar-Systems/ot-security-mcp) — ICS/SCADA security standards

---

<p align="center">
  <sub>Built with care in Stockholm 🇸🇪</sub><br>
  <sub>Production-ready Swedish legal research • Zero-hallucination guarantee • 4,827+ verified court decisions</sub>
</p>
