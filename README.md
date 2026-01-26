# MCP Server Template

> Production-ready template for building MCP servers in the Ansvar ecosystem

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## What is this?

This is a **GitHub template repository** for creating new MCP (Model Context Protocol) servers. It provides a complete, production-ready foundation including:

- **TypeScript** source with full type safety
- **SQLite FTS5** for fast full-text search
- **4 tool templates** (search, get-item, list, definitions)
- **Test suite** with in-memory database fixtures
- **CI/CD workflows** for testing and npm publishing
- **Docker support** for self-hosted deployment
- **Comprehensive documentation**

---

## Quick Start

### 1. Use This Template

Click **"Use this template"** → **"Create a new repository"**

Or clone directly:

```bash
gh repo create ansvar-systems/my-new-mcp --template ansvar-systems/mcp-server-template --public --clone
cd my-new-mcp
```

### 2. Follow the Checklist

Open [CHECKLIST.md](CHECKLIST.md) and work through each phase:

1. **Setup** — Update package identity and configuration
2. **Data Model** — Design your schema and create sample data
3. **Ingestion** — Implement source ingestion
4. **Tools** — Customize tools for your domain
5. **Documentation** — Complete README and COVERAGE
6. **Quality** — Test and verify
7. **Deployment** — Configure CI/CD
8. **Release** — Publish and announce

### 3. Read the Full Guide

For detailed architecture and customization instructions, see [SKELETON.md](SKELETON.md).

---

## What's Included

```
mcp-server-template/
├── .github/workflows/     # CI/CD (test, publish)
├── scripts/
│   ├── build-db.ts        # Database builder
│   ├── ingest-source.ts   # Data ingestion template
│   └── check-updates.ts   # Update checker
├── src/
│   ├── index.ts           # MCP server entry point
│   └── tools/
│       ├── search.ts      # Full-text search tool
│       ├── get-item.ts    # Item retrieval tool
│       ├── list.ts        # Listing tool
│       └── definitions.ts # Definition lookup tool
├── tests/
│   ├── fixtures/          # In-memory test database
│   └── tools/             # Tool tests
├── CHECKLIST.md           # Step-by-step setup guide
├── SKELETON.md            # Detailed architecture docs
├── PATTERNS.md            # Code patterns and conventions
├── PUBLISHING.md          # npm, Docker, registry guide
├── CONTRIBUTING.md        # Contribution guidelines
├── COVERAGE.md            # Source coverage template
├── Dockerfile             # Production Docker image
├── smithery.yaml          # Smithery registry config
└── package.json           # npm configuration
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CHECKLIST.md](CHECKLIST.md) | Step-by-step setup guide |
| [SKELETON.md](SKELETON.md) | Detailed architecture and customization |
| [PATTERNS.md](PATTERNS.md) | Code patterns and conventions |
| [PUBLISHING.md](PUBLISHING.md) | Publishing to npm, Docker, registries |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

---

## The Ansvar MCP Ecosystem

Servers built with this template:

| Server | Description | Status |
|--------|-------------|--------|
| [@ansvar/eu-regulations-mcp](https://github.com/ansvar-systems/EU_compliance_MCP) | GDPR, NIS2, DORA, AI Act, CRA | Live |
| @ansvar/swedish-law-mcp | Swedish statutes and regulations | Coming |
| @ansvar/nordic-law-mcp | Nordic legal frameworks | Coming |

---

## Features

### SQLite FTS5 Search

Built-in full-text search with BM25 ranking for fast, relevant results.

### Type-Safe Tools

Full TypeScript with JSON Schema validation for tool inputs.

### In-Memory Test Database

Fast, isolated tests with fixtures for rapid development.

### CI/CD Ready

GitHub Actions for testing on every push and npm release on version tags.

---

## Requirements

- Node.js 20+
- npm 9+

---

## License

Apache 2.0 — see [LICENSE](LICENSE)

---

## About

Built by [**Ansvar Systems AB**](https://ansvar.ai) — Stockholm, Sweden

Building the compliance infrastructure for Nordic AI.

---

<p align="center">
  <sub>Use this template to build your own MCP server</sub>
</p>
