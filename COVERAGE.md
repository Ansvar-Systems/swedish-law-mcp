# Data Coverage

> Comprehensive breakdown of Swedish legal data in this MCP server

## Overview

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Documents** | 6,726 | Statutes, cases, preparatory works |
| **Court Decisions** | 4,827 | 6 major courts, 2011-2023 |
| **Preparatory Works** | 1,818 | Propositions and SOUs |
| **Statutes** | 81 | High-relevance Swedish laws |
| **Provisions** | 16,980 | Individual statute sections |
| **Legal Definitions** | 615 | Extracted from statute text |
| **Database Size** | 37 MB | SQLite with FTS5 indexes |
| **Last Major Update** | 2026-02-12 | Full archive ingestion |

---

## Case Law Coverage

### By Court

| Court | Full Name | Cases | Coverage Period | Key Practice Areas |
|-------|-----------|-------|-----------------|-------------------|
| **NJA** | Högsta domstolen (Supreme Court) | 1,156 | 2011-2023 | Civil, criminal law |
| **HFD** | Högsta förvaltningsdomstolen | 965 | 2011-2023 | Tax, administrative law |
| **AD** | Arbetsdomstolen (Labour Court) | 985 | 2011-2023 | Employment, labor disputes |
| **RH** | Riksdagens ombudsmän | 845 | 2015-2022 | Human rights, govt accountability |
| **MÖD** | Mark- och miljööverdomstolen | 567 | 2011-2023 | Environment, land use |
| **MIG** | Migrationsöverdomstolen | 308 | 2011-2023 | Immigration, asylum |

**Total:** 4,827 court decisions

### By Year (NJA Example)

| Year | Cases | Coverage |
|------|-------|----------|
| 2022 | 94 | Complete archive |
| 2021 | 101 | Complete archive |
| 2020 | 93 | Complete archive |
| 2019 | 87 | Complete archive |
| 2018 | 93 | Complete archive |
| 2017 | 108 | Complete archive |
| 2016 | 104 | Complete archive |
| 2015 | 97 | Complete archive |
| 2014 | 87 | Complete archive |
| 2013 | ~90 | Complete archive |
| 2012 | ~90 | Complete archive |
| 2011 | ~90 | Complete archive |

*Similar coverage across all 6 courts for respective years*

### Case Law Features

- ✅ **Full-text search** — SQLite FTS5 on case summaries and keywords
- ✅ **Date filtering** — Query by decision date range
- ✅ **Court filtering** — Search specific courts or all courts
- ✅ **Cross-references** — Links to cited statutes (when available)
- ✅ **Source attribution** — All cases include CC-BY Domstolsverket attribution
- ✅ **Zero hallucination** — Every case verified against lagen.nu RDF metadata

### Case Law Limitations

- ❌ **No lower courts** — Tingsrätt, Hovrätt not included
- ❌ **Pre-2011 gaps** — Limited historical coverage (except NJA back to 2011)
- ❌ **No full opinions** — Summaries only, not complete court rulings
- ⚠️ **Language** — Swedish only, no English translations

---

## Preparatory Works (Förarbeten)

### Coverage

| Type | Count | Description |
|------|-------|-------------|
| **Propositions** (Prop.) | 1,817 | Government bills |
| **SOUs** | 1 | Official government reports |

**Total:** 1,818 preparatory works

### Validation

- ✅ **Riksdagen API verified** — Every proposition validated against official API
- ✅ **Statute linking** — 7,104 references linking 81 statutes to legislative history
- ✅ **Full-text search** — FTS5 on proposition titles and descriptions
- ✅ **Cross-references** — Bidirectional links between statutes and propositions

### Preparatory Works Features

- ✅ **Legislative intent research** — Understand government's reasoning behind laws
- ✅ **Historical context** — Access to original policy discussions
- ✅ **Multi-source aggregation** — Combine with statutes and case law
- ✅ **Zero hallucination** — Every proposition verified to exist in Riksdagen

### Preparatory Works Limitations

- ⚠️ **Summaries only** — Full proposition text not included (only metadata)
- ⚠️ **Recent laws prioritized** — Historical pre-2000s propositions less complete
- ❌ **No committee reports** — Riksdagens betänkanden not included

---

## Statutes

### Coverage by Legal Domain

| Domain | Statutes | Key Laws Included |
|--------|----------|-------------------|
| **Data Protection** | 3 | DSL (2018:218), PUL (1998:204), Kamerabevakningslagen |
| **Criminal Law** | 5 | Brottsbalken, Polislagen, Säkerhetsskyddslagen |
| **Civil Law** | 15 | Avtalslagen, Köplagen, Skuldebrev, Preskription, Skadestånd |
| **Family Law** | 5 | Äktenskapsbalken, Föräldrabalken, Sambolagen |
| **Labour Law** | 6 | LAS, MBL, Arbetsmiljölagen, Arbetstidslagen, Semesterlagen |
| **Tax Law** | 4 | Inkomstskattelagen, Mervärdesskattelagen, Skatteförfarandelagen |
| **Administrative** | 8 | Förvaltningslagen, OSL, Kommunallagen |
| **Procedure** | 6 | Rättegångsbalken, Förvaltningsprocesslagen, Utsökningsbalken |
| **Property** | 5 | Jordabalken, Plan- och bygglagen, Bostadsrättslagen |
| **Commercial** | 8 | Aktiebolagslagen, Årsredovisningslagen, Konkurslagen, Marknadsföringslagen |
| **Social Services** | 7 | Socialtjänstlagen, LSS, LVU, LVM, Hälso- och sjukvårdslagen |
| **Constitutional** | 3 | Regeringsformen, Tryckfrihetsförordningen, Yttrandefrihetsgrundlagen |
| **Other** | 6 | Utlänningslagen, Medborgarskapslagen, Miljöbalken |

**Total:** 81 statutes with 16,980 provisions

### Statute Features

- ✅ **Full provision text** — Complete wording for all included sections
- ✅ **Chapter/section structure** — Organized by Swedish legal structure
- ✅ **FTS5 full-text search** — Search across all provision text
- ✅ **Status tracking** — in_force, amended, repealed status
- ✅ **Preparatory works links** — Connected to legislative history
- ✅ **Legal definitions** — 615 terms extracted from provisions
- ✅ **Cross-references** — Links between related provisions

### Statute Limitations

- ⚠️ **Curated selection** — Not all Swedish laws included (81 of ~5,000 active laws)
- ❌ **No EU regulations** — Swedish implementation only, not source EU law
- ❌ **No historical versions** — Current consolidated text only
- ❌ **Limited amendments** — Amendment tracking incomplete
- ⚠️ **Manual updates** — Not auto-synced from Riksdagen

---

## Legal Definitions

### Coverage

| Source | Definitions | Example |
|--------|-------------|---------|
| **Extracted from statutes** | 615 | "Personuppgift" in DSL |

### Definition Features

- ✅ **Source-tracked** — Each definition linked to specific provision
- ✅ **Full-text search** — FTS5 on term and definition text
- ✅ **Contextual** — Includes surrounding legal text
- ✅ **Zero hallucination** — Extracted directly from statute text

### Definition Limitations

- ⚠️ **Statute-based only** — No case law definitions, no doctrinal definitions
- ⚠️ **Pattern-based extraction** — May miss definitions with non-standard wording
- ⚠️ **Swedish only** — No English translations

---

## Data Quality

### Verification & Validation

| Aspect | Status | Method |
|--------|--------|--------|
| **Case law accuracy** | ✅ 100% | RDF metadata validation from lagen.nu |
| **Proposition existence** | ✅ 100% | Riksdagen API verification |
| **Statute text** | ✅ High | Manual curation from official sources |
| **Citation formatting** | ✅ High | Parser validation against Swedish standards |
| **Database integrity** | ✅ 100% | SQLite constraints, FTS5 auto-sync |

### Ingestion Metrics

| Process | Success Rate | Last Run |
|---------|--------------|----------|
| **Case law ingestion** | 100% (0 failures) | 2026-02-12 |
| **Prep works validation** | 100% (0 failures) | 2026-02-12 |
| **Definition extraction** | ~95% (pattern-based) | 2026-02-12 |
| **Database rebuild** | 100% | 2026-02-12 |

---

## Update Frequency

| Data Type | Current Status | Update Method | Frequency |
|-----------|----------------|---------------|-----------|
| **Statutes** | Manual | Curated ingestion | As needed |
| **Case law** | Complete archive | Auto-sync from lagen.nu | Weekly (potential) |
| **Prep works** | Complete | API validation | On-demand |
| **Definitions** | Complete | Automated extraction | With statute updates |

---

## Known Gaps & Future Coverage

### Priority Gaps

1. **Lower courts** (Tingsrätt, Hovrätt) — not available in lagen.nu archive
2. **EU law** — directives, regulations, CJEU case law
3. **Historical statute versions** — pre-consolidation amendments
4. **Full case opinions** — lagen.nu provides summaries only
5. **Pre-2011 cases** — historical archive limited

### Planned Expansions

- [ ] Weekly auto-sync for new court decisions
- [ ] EU law cross-references (link Swedish → EU regulations)
- [ ] Historical statute versions (amendment tracking)
- [ ] English translations for key statutes
- [ ] Expanded preparatory works (full text, not just metadata)

---

## Data Sources

All data sourced from authoritative Swedish legal databases:

1. **[Riksdagen](https://riksdagen.se/)** — Statutes, propositions, SOUs
   - License: Swedish Government (public domain)
   - Access: Official open data API

2. **[Svensk Forfattningssamling](https://svenskforfattningssamling.se/)** — Official statute collection
   - License: Swedish Government (public domain)
   - Access: Web scraping with respect for ToS

3. **[Lagen.nu](https://lagen.nu)** — Court decisions, curated legal database
   - License: CC-BY Domstolsverket
   - Access: RDF/XML feeds, web scraping
   - Attribution: Included in all case law results

---

## Coverage Comparison

### vs. Other Swedish Legal Databases

| Feature | This MCP | Rättsnätet | Zeteo | Karnov | Norstedts Juridik |
|---------|----------|------------|-------|--------|-------------------|
| **Statutes** | 81 (curated) | All (~5,000) | All | All | All |
| **Case law** | 4,827 (2011-2023) | All courts | All courts | All courts | All courts |
| **Lower courts** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Prep works** | 1,818 (metadata) | Full text | Full text | Full text | Full text |
| **EU law** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Free/Open** | ✅ | Limited | ❌ | ❌ | ❌ |
| **MCP/AI access** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Zero hallucination** | ✅ | N/A | N/A | N/A | N/A |

**Key Advantage:** Zero-hallucination AI-powered search on verified data, completely free and open-source.

---

## Contact

For coverage questions or data quality issues:
- **Issues:** [GitHub Issues](https://github.com/Ansvar-Systems/swedish-law-mcp/issues)
- **Email:** contact@ansvar.ai

---

<p align="center">
  <sub>Last updated: 2026-02-12</sub><br>
  <sub>Next major update: TBD (weekly auto-sync planned)</sub>
</p>
