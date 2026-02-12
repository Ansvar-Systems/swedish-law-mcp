# Swedish Law MCP Server

> Query Swedish statutes and regulations directly from Claude

[![npm version](https://img.shields.io/npm/v/@ansvar/swedish-law-mcp)](https://www.npmjs.com/package/@ansvar/swedish-law-mcp)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## Overview

This MCP (Model Context Protocol) server gives AI assistants direct access to Swedish law from Riksdagen's official database. No more switching between tabs or searching through PDF documents.

### What's Included

| Source | Description | Status |
|--------|-------------|--------|
| **SFS** (Svensk Forfattningssamling) | Curated high-relevance statutes (family, civil, criminal, tax, procedure, public law) | Available |
| **Key Regulations** | GDPR implementation, PuL, labor, secrecy, tax and social insurance laws | Available |

### Use Cases

- "What does the Swedish GDPR implementation say about data breaches?"
- "Show me the requirements for arbetsmiljo (workplace safety)"
- "What are the penalties under Swedish criminal law for fraud?"
- "Compare Swedish and EU data protection requirements"

---

## Installation

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

## Available Tools

### `search_legislation`

Full-text search across all Swedish statutes. Supports optional `as_of_date` (`YYYY-MM-DD`) for historical lookups.

```
"Search for data protection requirements in Swedish law"
-> Returns matching sections with context
```

### `get_provision`

Retrieve a specific section from a statute. Supports optional `as_of_date` (`YYYY-MM-DD`) to return the version valid on that date.

```
"Get SFS 2018:218 Chapter 3 Section 5"
-> Returns the full text of that section
```

### `search_case_law`

Search Swedish case law (rattsfall) by query, court, and date.

### `get_preparatory_works`

Get linked propositions/SOU documents for a statute (when available in seed data).

### `validate_citation`

Validate a citation against the local database and return warnings.

### `build_legal_stance`

Aggregate citations across legislation, case law, and preparatory works. Supports optional `as_of_date` for time-aware retrieval.

### `format_citation`

Format a citation in full, short, or pinpoint style.

### `check_currency`

Check if a statute is in force, amended, or repealed. Supports optional `as_of_date` for historical in-force status.

### Historical Coverage Note

- Historical queries are supported through provision validity windows.
- If a statute only has one consolidated provision version in seed data, `as_of_date` can still determine in-force status windows but may return current consolidated wording.
- Add explicit `provision_versions` in seed files to provide exact historical wording changes.

---

## Data Sources

All content is sourced from official Swedish government sources:

- **[Riksdagen](https://riksdagen.se/)** - Swedish Parliament's legal database
- **[Svensk Forfattningssamling](https://svenskforfattningssamling.se/)** - Official statute collection

---

## Development

```bash
git clone https://github.com/Ansvar-Systems/swedish-law-mcp
cd swedish-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev
```

### Refreshing Legal Data

```bash
# Re-ingest curated relevant statutes from Riksdagen
node --import tsx scripts/ingest-relevant-laws.ts

# Optional: inspect seed quality (duplicates/collisions)
node --import tsx scripts/audit-seeds.ts

# Rebuild SQLite database from seed files
node --import tsx scripts/build-db.ts
```

### Testing with MCP Inspector

```bash
npx @anthropic/mcp-inspector node dist/index.js
```

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Additional statute coverage
- Swedish legal term definitions
- Cross-references between laws
- Historical versions

---

## License

Apache 2.0 - see [LICENSE](LICENSE)

---

## About

Built by [**Ansvar Systems AB**](https://ansvar.ai) - Stockholm, Sweden

Part of the [Ansvar MCP Ecosystem](https://github.com/Ansvar-Systems):
- [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP) - EU regulations
- @ansvar/swedish-law-mcp - Swedish law (this server)
- @ansvar/nordic-law-mcp - Nordic legal frameworks

---

<p align="center">
  <sub>Built with care in Stockholm</sub>
</p>
