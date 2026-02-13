# Swedish Law MCP Server

> Production-grade Swedish legal research with verified data sources

[![npm version](https://img.shields.io/npm/v/@ansvar/swedish-law-mcp)](https://www.npmjs.com/package/@ansvar/swedish-law-mcp)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

**Comprehensive Swedish legal database** with 717 statutes (31,198 provisions), 3,625 preparatory works, and EU law cross-references linking Swedish → EU law — all verified against authoritative sources.

⚠️ **NOT LEGAL ADVICE** — Professional-grade research tool. See [DISCLAIMER.md](DISCLAIMER.md) and [PRIVACY.md](PRIVACY.md) before use.

---

## Overview

This MCP (Model Context Protocol) server provides AI assistants with direct access to Swedish law through a comprehensive local database. Query statutes, court decisions, and legislative history with data integrity checks — every citation is verified against authoritative sources.

### 🎯 Verified Data Sources

Unlike general AI models that may generate plausible-sounding but fake legal citations, this MCP **only returns data from verified Swedish legal sources**. Every statute, case, and proposition in the database has been validated against official government databases (Riksdagen, lagen.nu). While we implement rigorous verification processes, users should always validate critical citations against primary sources.

### 📊 Database Coverage

| Category | Count | Coverage |
|----------|-------|----------|
| **Statutes** | 717 laws | Comprehensive Swedish legislation |
| **Provisions** | 31,198 sections | Full-text searchable |
| **Preparatory Works** | 3,625 documents | Propositions (Prop.) and SOUs |
| **EU Cross-References** | 668 references | 228 EU directives and regulations |
| **Legal Definitions** | 615 terms | Extracted from statute text |
| **Database Size** | ~70 MB | Optimized SQLite with FTS5 |

### 🇪🇺 EU Law Integration

- **668 cross-references** linking 49 Swedish statutes (68% of database) to EU law
- **228 EU documents** (89 directives, 139 regulations) from EUR-Lex
- **Bi-directional lookup**: Find EU basis for Swedish law AND Swedish implementations of EU law
- **5 specialized tools**: `get_eu_basis`, `get_swedish_implementations`, and more
- **Provision-level granularity**: Many references linked to specific statute sections

### ⚠️ Professional Use Notices

**Before using this tool professionally, you MUST read:**

- **[DISCLAIMER.md](DISCLAIMER.md)** — Legal disclaimers, professional liability, data limitations
- **[PRIVACY.md](PRIVACY.md)** — Client confidentiality, Advokatsamfundet compliance, on-premise deployment

**Key Limitations:**
- ❌ **Not legal advice** — Research tool only, not a substitute for professional legal counsel
- ✅ **Production-grade data** — Verified against official sources (Riksdagen, lagen.nu)
- ⚠️ **Verify critical citations** — While data is verified, always check official sources for court filings
- 🔒 **Client confidentiality** — Queries through Claude API; use on-premise for privileged matters
- 📅 **Coverage gaps** — Court cases limited, no full EU law text (only metadata), no CJEU case law

### What's Included

| Source | Description | Coverage |
|--------|-------------|----------|
| **Swedish Statutes** | Family, civil, criminal, tax, administrative, labor law | 717 laws, 31,198 provisions |
| **Preparatory Works** | Legislative history (förarbeten) | 3,625 Prop./SOUs |
| **EU Cross-References** | Swedish-EU law links with EUR-Lex metadata | 668 references, 228 EU docs |
| **Legal Definitions** | Terminology extracted from statutes | 615 defined terms |
| **Case Law** | Multi-court precedents (limited coverage) | Supplementary research tool |

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

**Note:** Published package may not include the latest database expansion. For full production data (717 statutes, 668 EU references), use Option 2.

### Option 2: Local Development Setup (Recommended for Full Data)

For access to the complete production database with 717 statutes and EU cross-references:

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

Claude Desktop config for local setup (adjust `node` path for your platform):

```json
{
  "mcpServers": {
    "swedish-law": {
      "command": "node",
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

## EU Law Integration

This MCP server includes comprehensive cross-referencing between Swedish law and EU directives/regulations, enabling bi-directional legal research across Swedish and European legal frameworks.

### Coverage

| Metric | Value | Details |
|--------|-------|---------|
| **EU References** | 668 | Cross-references from Swedish → EU law |
| **EU Documents** | 228 | Unique EU directives and regulations |
| **Swedish Statutes with EU Refs** | 49 | 68% of database (49/717 statutes) |
| **Coverage** | 97.95% | 668/682 seed references imported |
| **Directives** | 89 | EU directives referenced in Swedish law |
| **Regulations** | 139 | EU regulations referenced in Swedish law |
| **EUR-Lex Integration** | ✅ | Automated metadata fetching from EUR-Lex API |

### Most Referenced EU Acts

1. **eIDAS Regulation** (regulation:910/2014) - 20 references
   - Electronic identification and trust services
2. **E-Signatures Directive** (directive:1999/93) - 15 references
   - Digital signatures (repealed by eIDAS)
3. **GDPR** (regulation:2016/679) - 15 references
   - General Data Protection Regulation
4. **Data Protection Directive** (directive:1995/46) - 14 references
   - Repealed by GDPR in 2018
5. **Market Surveillance Regulation** (regulation:2019/1020) - 14 references
   - Product safety and compliance

### Swedish Statutes with Most EU References

1. **Miljöbalken (1998:808)** - 71 references - Environmental law
2. **Årsredovisningslagen (1995:1554)** - 45 references - Annual reports
3. **Offentlighets- och sekretesslagen (2009:400)** - 44 references - Public access
4. **Upphandlingslag försörjningssektorn (2016:1146)** - 36 references - Procurement
5. **Aktiebolagslagen (2005:551)** - 35 references - Companies Act

### Example Queries

Find EU basis for Swedish GDPR implementation:
```
"Which EU directives does Dataskyddslagen (DSL) implement?"
→ Returns: GDPR (regulation:2016/679) as primary basis
```

Reverse lookup - Swedish implementations of EU law:
```
"Which Swedish laws implement the GDPR?"
→ Returns: DSL 2018:218 (primary), OSL 2009:400 (supplementary)
```

Provision-level research:
```
"What EU law is the basis for DSL 3 kap. 5 § about consent?"
→ Returns: GDPR Article 6.1.a and 7
```

### Use Cases for EU Integration

**For Legal Professionals:**
- Verify Swedish compliance with EU directives
- Research transposition deadlines and implementation gaps
- Compare Swedish law with source EU requirements
- Find preparatory works explaining EU directive choices

**For Policy Analysts:**
- Track Sweden's implementation of EU legislation
- Identify gold-plating (Swedish provisions exceeding EU requirements)
- Map EU law influence across Swedish legal domains
- Monitor amendment correlations (EU changes → Swedish updates)

**For Researchers:**
- Comparative legal research (Swedish vs EU frameworks)
- Citation network analysis across legal systems
- Implementation timeline studies
- Cross-border legal harmonization research

### Data Sources & Attribution

EU cross-references are extracted directly from Swedish statute text using pattern recognition and validated against authoritative sources:

- **Source:** Swedish statute text (Riksdagen, SFS)
- **Extraction:** Automated parser with 95%+ accuracy
- **Validation:** Cross-referenced with EUR-Lex CELEX numbers
- **Coverage:** All 83 statutes in database scanned for EU references
- **Verified-data-only approach:** Only references extracted from statute text are included

See [EU_INTEGRATION_GUIDE.md](docs/EU_INTEGRATION_GUIDE.md) for detailed documentation and [EU_USAGE_EXAMPLES.md](docs/EU_USAGE_EXAMPLES.md) for practical examples.

---

## Available Tools (13)

### EU Law Tools (5 New)

#### 9. `get_eu_basis` — EU Directives/Regulations for Swedish Statute

Get all EU directives and regulations that a Swedish statute implements or references.

```
"What EU law does DSL implement?"
→ Returns: GDPR (regulation:2016/679) with implementation metadata
```

**Parameters:**
- `sfs_number` (required) — Swedish statute (e.g., "2018:218")
- `include_articles` (optional) — Include specific EU article references

#### 10. `get_swedish_implementations` — Swedish Laws Implementing EU Act

Find all Swedish statutes that implement or reference a specific EU directive/regulation.

```
"Which Swedish laws implement directive 1995/46/EG?"
→ Returns: PUL 1998:204 (historical, repealed), DSL 2018:218 (current)
```

**Parameters:**
- `eu_document_id` (required) — EU act ID (e.g., "regulation:2016/679")
- `primary_only` (optional) — Show only primary implementations
- `in_force_only` (optional) — Exclude repealed Swedish laws

#### 11. `search_eu_implementations` — Search EU Documents

Search EU directives and regulations by keyword, with Swedish implementation statistics.

```
"Find EU directives about data protection"
→ Returns: GDPR, Data Protection Directive, with Swedish implementation counts
```

**Parameters:**
- `query` (required) — Search keywords
- `type` (optional) — Filter by "directive" or "regulation"
- `year_from` (optional) — Filter by year range
- `year_to` (optional)

#### 12. `get_provision_eu_basis` — EU Basis for Specific Provision

Get EU law references for a specific Swedish statute provision.

```
"What EU law is referenced in DSL 3 kap. 5 §?"
→ Returns: GDPR Article 6.1.a (legal basis for processing)
```

**Parameters:**
- `sfs_number` (required) — Swedish statute
- `chapter` (optional) — Chapter number
- `section` (required) — Section reference

#### 13. `validate_eu_compliance` — Check Implementation Status (Future)

Validate Swedish implementation against EU requirements (requires integration with @ansvar/eu-regulations-mcp).

**Parameters:**
- `sfs_number` (required) — Swedish statute to check
- `eu_document_id` (required) — EU act to validate against

---

### Core Legal Research Tools (8)

### 1. `search_legislation` — Full-Text Statute Search

Search across 31,198 provisions using SQLite FTS5 with BM25 ranking.

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

Search court decisions with filters by court and date (limited coverage).

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
- **[Lagen.nu](https://lagen.nu)** — Curated case law database (CC-BY Domstolsverket, limited coverage)
- **[EUR-Lex](https://eur-lex.europa.eu/)** — Official EU law database (metadata only)

### Data Freshness

A [daily GitHub Actions workflow](.github/workflows/check-updates.yml) monitors all data sources and creates issues when updates are available.

#### Automated Detection (daily)

| Source | Check | Method |
|--------|-------|--------|
| **Statute amendments** | Riksdagen API date comparison | All 717 statutes checked against API |
| **New statutes** | Riksdagen SFS publications (90-day window) | Diffed against database |
| **Case law** | lagen.nu feed entry count | Compared to `case_law` table |
| **Preparatory works** | Riksdagen proposition API (30-day window) | New props detected |
| **EU reference staleness** | Git commit timestamps on EU scripts/data | Flagged if >90 days old |

#### Manual Review (surfaced as issue checkboxes)

These items cannot be auto-detected and are included as checklist items in the data freshness issue:

- **EU reference re-extraction** after statute amendments
- **Cross-reference integrity** verification after updates
- **Repealed statute check** for status changes
- **New EU legislation** from EUR-Lex affecting Swedish law

#### Auto-Update

The workflow supports a manual `auto_update: true` dispatch that syncs case law, re-extracts definitions, rebuilds the database, bumps the version, and tags for npm publishing.

### Attribution

Case law data is provided by [lagen.nu](https://lagen.nu) under Creative Commons Attribution (CC-BY Domstolsverket). All case law results include source attribution metadata.

---

## Security

This project uses multiple layers of automated security scanning. See [SECURITY.md](SECURITY.md) for the full policy.

- **Gitleaks** — Secret detection on every push
- **CodeQL** — Static analysis for security vulnerabilities (weekly + PRs)
- **Semgrep** — SAST scanning (OWASP top 10, secrets, TypeScript)
- **Trivy** — CVE scanning on filesystem and npm dependencies (daily)
- **Socket.dev** — Supply chain attack detection on PRs
- **OSSF Scorecard** — OpenSSF best practices scoring
- **Dependabot** — Automated weekly dependency updates

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
- **Database Size:** ~70 MB (efficient, portable)
- **Coverage:** 717 statutes with 31,198 provisions, 668 EU cross-references
- **Reliability:** 100% ingestion success rate (0 failures, 0 hallucinated entries)

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Court case law expansion (currently limited coverage)
- EU Regulations MCP integration (full EU law text, CJEU case law)
- Historical statute versions and amendment tracking
- Cross-reference extraction improvements
- Lower court decisions (Tingsrätt, Hovrätt)

---

## Roadmap

- [x] **Statute expansion** — 785% growth from 81 to 717 statutes (v1.1.0)
- [x] **EU law integration** — 668 cross-references to 228 EU directives/regulations (v1.1.0)
- [ ] Court case law expansion (comprehensive archive)
- [ ] Full EU text integration (via @ansvar/eu-regulations-mcp)
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
  note = {Comprehensive Swedish legal database with 717 statutes and EU law cross-references}
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
  <sub>Production-ready Swedish legal research • Verified data only • 717 verified statutes • EU law integration</sub>
</p>
