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
| **SFS** (Svensk Forfattningssamling) | Swedish Code of Statutes | Planned |
| **Key Regulations** | GDPR implementation, PuL, etc. | Planned |

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

### `search_laws`

Full-text search across all Swedish statutes.

```
"Search for data protection requirements in Swedish law"
-> Returns matching sections with context
```

### `get_section`

Retrieve a specific section from a statute.

```
"Get SFS 2018:218 Chapter 3 Section 5"
-> Returns the full text of that section
```

### `list_statutes`

List available statutes or show structure of a specific law.

```
"List all statutes related to arbetsmiljo"
-> Returns overview of workplace safety laws
```

### `get_definitions`

Look up official definitions from Swedish law.

```
"What is the Swedish legal definition of personuppgift?"
-> Returns the official definition
```

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
