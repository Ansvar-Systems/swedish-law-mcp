#!/usr/bin/env tsx
/**
 * Database builder for Swedish Legal Citation MCP server.
 *
 * Builds the SQLite database from seed JSON files in data/seed/.
 *
 * Usage: npm run build:db
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.resolve(__dirname, '../data/seed');
const DB_PATH = path.resolve(__dirname, '../data/database.db');

// ─────────────────────────────────────────────────────────────────────────────
// Seed file types
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentSeed {
  id: string;
  type: 'statute' | 'bill' | 'sou' | 'ds' | 'case_law';
  title: string;
  title_en?: string;
  short_name?: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issued_date?: string;
  in_force_date?: string;
  url?: string;
  description?: string;
  provisions?: ProvisionSeed[];
  provision_versions?: ProvisionVersionSeed[];
  definitions?: DefinitionSeed[];
  preparatory_works?: PrepWorkSeed[];
  case_law?: CaseLawSeed;
}

interface ProvisionSeed {
  provision_ref: string;
  chapter?: string;
  section: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  valid_from?: string;
  valid_to?: string;
}

interface ProvisionVersionSeed {
  provision_ref: string;
  chapter?: string;
  section: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  valid_from?: string;
  valid_to?: string;
}

interface DefinitionSeed {
  term: string;
  term_en?: string;
  definition: string;
  source_provision?: string;
}

interface PrepWorkSeed {
  prep_document_id: string;
  title: string;
  summary?: string;
}

interface CaseLawSeed {
  court: string;
  case_number?: string;
  decision_date?: string;
  summary?: string;
  keywords?: string;
  cited_statutes?: string[];
}

interface CrossRefSeed {
  source_document_id: string;
  source_provision_ref?: string;
  target_document_id: string;
  target_provision_ref?: string;
  ref_type: string;
}

interface ProvisionDedupStats {
  duplicate_refs: number;
  conflicting_duplicates: number;
}

interface PendingPrepWork {
  statute_id: string;
  prep_document_id: string;
  title: string;
  summary?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database schema
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA = `
-- Legal documents (statutes, bills, SOUs, case law)
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('statute', 'bill', 'sou', 'ds', 'case_law')),
  title TEXT NOT NULL,
  title_en TEXT,
  short_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_force'
    CHECK(status IN ('in_force', 'amended', 'repealed', 'not_yet_in_force')),
  issued_date TEXT,
  in_force_date TEXT,
  url TEXT,
  description TEXT,
  last_updated TEXT DEFAULT (datetime('now'))
);

-- Individual provisions from statutes
CREATE TABLE legal_provisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,
  UNIQUE(document_id, provision_ref)
);

CREATE INDEX idx_provisions_doc ON legal_provisions(document_id);
CREATE INDEX idx_provisions_chapter ON legal_provisions(document_id, chapter);

-- FTS5 for provision search
CREATE VIRTUAL TABLE provisions_fts USING fts5(
  content, title,
  content='legal_provisions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER provisions_ai AFTER INSERT ON legal_provisions BEGIN
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TRIGGER provisions_ad AFTER DELETE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
END;

CREATE TRIGGER provisions_au AFTER UPDATE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

-- Historical provision versions for date-aware lookups
CREATE TABLE legal_provision_versions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,
  valid_from TEXT,
  valid_to TEXT
);

CREATE INDEX idx_provision_versions_doc_ref
  ON legal_provision_versions(document_id, provision_ref);
CREATE INDEX idx_provision_versions_window
  ON legal_provision_versions(valid_from, valid_to);

CREATE VIRTUAL TABLE provision_versions_fts USING fts5(
  content, title,
  content='legal_provision_versions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER provision_versions_ai AFTER INSERT ON legal_provision_versions BEGIN
  INSERT INTO provision_versions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TRIGGER provision_versions_ad AFTER DELETE ON legal_provision_versions BEGIN
  INSERT INTO provision_versions_fts(provision_versions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
END;

CREATE TRIGGER provision_versions_au AFTER UPDATE ON legal_provision_versions BEGIN
  INSERT INTO provision_versions_fts(provision_versions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
  INSERT INTO provision_versions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

-- Case law metadata
CREATE TABLE case_law (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE REFERENCES legal_documents(id),
  court TEXT NOT NULL,
  case_number TEXT,
  decision_date TEXT,
  summary TEXT,
  keywords TEXT
);

-- FTS5 for case law search
CREATE VIRTUAL TABLE case_law_fts USING fts5(
  summary, keywords,
  content='case_law',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER case_law_ai AFTER INSERT ON case_law BEGIN
  INSERT INTO case_law_fts(rowid, summary, keywords)
  VALUES (new.id, new.summary, new.keywords);
END;

CREATE TRIGGER case_law_ad AFTER DELETE ON case_law BEGIN
  INSERT INTO case_law_fts(case_law_fts, rowid, summary, keywords)
  VALUES ('delete', old.id, old.summary, old.keywords);
END;

CREATE TRIGGER case_law_au AFTER UPDATE ON case_law BEGIN
  INSERT INTO case_law_fts(case_law_fts, rowid, summary, keywords)
  VALUES ('delete', old.id, old.summary, old.keywords);
  INSERT INTO case_law_fts(rowid, summary, keywords)
  VALUES (new.id, new.summary, new.keywords);
END;

-- Preparatory works (forarbeten) linking statutes to bills/SOUs
CREATE TABLE preparatory_works (
  id INTEGER PRIMARY KEY,
  statute_id TEXT NOT NULL REFERENCES legal_documents(id),
  prep_document_id TEXT NOT NULL REFERENCES legal_documents(id),
  title TEXT,
  summary TEXT
);

CREATE INDEX idx_prep_statute ON preparatory_works(statute_id);

-- FTS5 for preparatory works search
CREATE VIRTUAL TABLE prep_works_fts USING fts5(
  title, summary,
  content='preparatory_works',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER prep_works_ai AFTER INSERT ON preparatory_works BEGIN
  INSERT INTO prep_works_fts(rowid, title, summary)
  VALUES (new.id, new.title, new.summary);
END;

CREATE TRIGGER prep_works_ad AFTER DELETE ON preparatory_works BEGIN
  INSERT INTO prep_works_fts(prep_works_fts, rowid, title, summary)
  VALUES ('delete', old.id, old.title, old.summary);
END;

CREATE TRIGGER prep_works_au AFTER UPDATE ON preparatory_works BEGIN
  INSERT INTO prep_works_fts(prep_works_fts, rowid, title, summary)
  VALUES ('delete', old.id, old.title, old.summary);
  INSERT INTO prep_works_fts(rowid, title, summary)
  VALUES (new.id, new.title, new.summary);
END;

-- Cross-references between provisions/documents
CREATE TABLE cross_references (
  id INTEGER PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES legal_documents(id),
  source_provision_ref TEXT,
  target_document_id TEXT NOT NULL REFERENCES legal_documents(id),
  target_provision_ref TEXT,
  ref_type TEXT NOT NULL DEFAULT 'references'
    CHECK(ref_type IN ('references', 'amended_by', 'implements', 'see_also'))
);

CREATE INDEX idx_xref_source ON cross_references(source_document_id);
CREATE INDEX idx_xref_target ON cross_references(target_document_id);

-- Legal term definitions
CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  term TEXT NOT NULL,
  term_en TEXT,
  definition TEXT NOT NULL,
  source_provision TEXT,
  UNIQUE(document_id, term)
);

-- FTS5 for definition search
CREATE VIRTUAL TABLE definitions_fts USING fts5(
  term, definition,
  content='definitions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER definitions_ai AFTER INSERT ON definitions BEGIN
  INSERT INTO definitions_fts(rowid, term, definition)
  VALUES (new.id, new.term, new.definition);
END;

CREATE TRIGGER definitions_ad AFTER DELETE ON definitions BEGIN
  INSERT INTO definitions_fts(definitions_fts, rowid, term, definition)
  VALUES ('delete', old.id, old.term, old.definition);
END;

CREATE TRIGGER definitions_au AFTER UPDATE ON definitions BEGIN
  INSERT INTO definitions_fts(definitions_fts, rowid, term, definition)
  VALUES ('delete', old.id, old.term, old.definition);
  INSERT INTO definitions_fts(rowid, term, definition)
  VALUES (new.id, new.term, new.definition);
END;
`;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractRepealDateFromDescription(description: string | undefined): string | undefined {
  if (!description) {
    return undefined;
  }
  const match = description.match(/Upphävd\s+(\d{4}-\d{2}-\d{2})/i);
  return match?.[1];
}

function deriveDocumentValidityWindow(seed: DocumentSeed): { validFrom: string | null; validTo: string | null } {
  return {
    validFrom: seed.in_force_date ?? seed.issued_date ?? null,
    validTo: seed.status === 'repealed' ? extractRepealDateFromDescription(seed.description) ?? null : null,
  };
}

function isoDateValue(date: string | undefined): number {
  if (!date) {
    return Number.NEGATIVE_INFINITY;
  }
  return Date.parse(`${date}T00:00:00Z`);
}

function selectLatestProvisionVersions(versions: ProvisionVersionSeed[]): ProvisionSeed[] {
  const byRef = new Map<string, ProvisionVersionSeed>();

  for (const version of versions) {
    const existing = byRef.get(version.provision_ref);
    if (!existing || isoDateValue(version.valid_from) > isoDateValue(existing.valid_from)) {
      byRef.set(version.provision_ref, version);
    }
  }

  return Array.from(byRef.values()).map(v => ({
    provision_ref: v.provision_ref,
    chapter: v.chapter,
    section: v.section,
    title: v.title,
    content: v.content,
    metadata: v.metadata,
    valid_from: v.valid_from,
    valid_to: v.valid_to,
  }));
}

function pickPreferredProvision(existing: ProvisionSeed, incoming: ProvisionSeed): ProvisionSeed {
  const existingContent = normalizeWhitespace(existing.content);
  const incomingContent = normalizeWhitespace(incoming.content);

  if (incomingContent.length > existingContent.length) {
    return {
      ...incoming,
      title: incoming.title ?? existing.title,
    };
  }

  return {
    ...existing,
    title: existing.title ?? incoming.title,
  };
}

function dedupeProvisions(provisions: ProvisionSeed[]): { deduped: ProvisionSeed[]; stats: ProvisionDedupStats } {
  const byRef = new Map<string, ProvisionSeed>();
  const stats: ProvisionDedupStats = {
    duplicate_refs: 0,
    conflicting_duplicates: 0,
  };

  for (const provision of provisions) {
    const ref = provision.provision_ref.trim();
    const existing = byRef.get(ref);

    if (!existing) {
      byRef.set(ref, {
        ...provision,
        provision_ref: ref,
      });
      continue;
    }

    stats.duplicate_refs++;

    const existingContent = normalizeWhitespace(existing.content);
    const incomingContent = normalizeWhitespace(provision.content);

    if (existingContent !== incomingContent) {
      stats.conflicting_duplicates++;
    }

    byRef.set(ref, pickPreferredProvision(existing, provision));
  }

  return {
    deduped: Array.from(byRef.values()),
    stats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────────

function buildDatabase(): void {
  console.log('Building Swedish Legal Citation database...\n');

  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.exec(SCHEMA);

  // Prepared statements
  const insertDoc = db.prepare(`
    INSERT INTO legal_documents (id, type, title, title_en, short_name, status, issued_date, in_force_date, url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProvision = db.prepare(`
    INSERT INTO legal_provisions (document_id, provision_ref, chapter, section, title, content, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProvisionVersion = db.prepare(`
    INSERT INTO legal_provision_versions (
      document_id, provision_ref, chapter, section, title, content, metadata, valid_from, valid_to
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCaseLaw = db.prepare(`
    INSERT INTO case_law (document_id, court, case_number, decision_date, summary, keywords)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPrepWork = db.prepare(`
    INSERT INTO preparatory_works (statute_id, prep_document_id, title, summary)
    VALUES (?, ?, ?, ?)
  `);

  const insertDefinition = db.prepare(`
    INSERT INTO definitions (document_id, term, term_en, definition, source_provision)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertCrossRef = db.prepare(`
    INSERT INTO cross_references (source_document_id, source_provision_ref, target_document_id, target_provision_ref, ref_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Load seed files
  if (!fs.existsSync(SEED_DIR)) {
    console.log(`No seed directory at ${SEED_DIR} — creating empty database.`);
    db.close();
    return;
  }

  const seedFiles = fs.readdirSync(SEED_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('.') && !f.startsWith('_'));

  if (seedFiles.length === 0) {
    console.log('No seed files found. Database created with empty schema.');
    db.close();
    return;
  }

  let totalDocs = 0;
  let totalProvisions = 0;
  let totalProvisionVersions = 0;
  let totalDefs = 0;
  let totalDuplicateRefs = 0;
  let totalConflictingDuplicates = 0;
  const pendingPrepWorks: PendingPrepWork[] = [];

  const loadAll = db.transaction(() => {
    for (const file of seedFiles) {
      const filePath = path.join(SEED_DIR, file);
      console.log(`  Loading ${file}...`);

      const content = fs.readFileSync(filePath, 'utf-8');
      const seed = JSON.parse(content) as DocumentSeed;

      insertDoc.run(
        seed.id, seed.type, seed.title, seed.title_en ?? null,
        seed.short_name ?? null, seed.status,
        seed.issued_date ?? null, seed.in_force_date ?? null,
        seed.url ?? null, seed.description ?? null
      );
      totalDocs++;

      const { deduped, stats } = dedupeProvisions(seed.provisions ?? []);
      totalDuplicateRefs += stats.duplicate_refs;
      totalConflictingDuplicates += stats.conflicting_duplicates;
      if (stats.duplicate_refs > 0) {
        console.log(
          `    WARNING: ${stats.duplicate_refs} duplicate refs in ${seed.id} ` +
          `(${stats.conflicting_duplicates} with different text).`
        );
      }

      const documentWindow = deriveDocumentValidityWindow(seed);
      const versionCandidates = seed.provision_versions ?? deduped;
      const { deduped: dedupedVersions } = dedupeProvisions(versionCandidates);
      const currentProvisions = deduped.length > 0
        ? deduped
        : selectLatestProvisionVersions(dedupedVersions);

      for (const prov of currentProvisions) {

        insertProvision.run(
          seed.id, prov.provision_ref, prov.chapter ?? null,
          prov.section, prov.title ?? null, prov.content,
          prov.metadata ? JSON.stringify(prov.metadata) : null
        );
        totalProvisions++;
      }

      for (const version of dedupedVersions) {
        insertProvisionVersion.run(
          seed.id,
          version.provision_ref,
          version.chapter ?? null,
          version.section,
          version.title ?? null,
          version.content,
          version.metadata ? JSON.stringify(version.metadata) : null,
          version.valid_from ?? documentWindow.validFrom,
          version.valid_to ?? documentWindow.validTo
        );
        totalProvisionVersions++;
      }

      for (const def of seed.definitions ?? []) {
        insertDefinition.run(
          seed.id, def.term, def.term_en ?? null,
          def.definition, def.source_provision ?? null
        );
        totalDefs++;
      }

      if (seed.case_law) {
        insertCaseLaw.run(
          seed.id, seed.case_law.court,
          seed.case_law.case_number ?? null,
          seed.case_law.decision_date ?? null,
          seed.case_law.summary ?? null,
          seed.case_law.keywords ?? null
        );
      }

      for (const pw of seed.preparatory_works ?? []) {
        pendingPrepWorks.push({
          statute_id: seed.id,
          prep_document_id: pw.prep_document_id,
          title: pw.title,
          summary: pw.summary,
        });
      }

      console.log(
        `    ${currentProvisions.length} provisions, ${dedupedVersions.length} provision versions, ` +
        `${seed.definitions?.length ?? 0} definitions`
      );
    }

    for (const pw of pendingPrepWorks) {
      insertPrepWork.run(pw.statute_id, pw.prep_document_id, pw.title, pw.summary ?? null);
    }

    // Load cross-references file if it exists
    const xrefPath = path.join(SEED_DIR, '_cross_references.json');
    if (fs.existsSync(xrefPath)) {
      const xrefs = JSON.parse(fs.readFileSync(xrefPath, 'utf-8')) as CrossRefSeed[];
      for (const xref of xrefs) {
        insertCrossRef.run(
          xref.source_document_id, xref.source_provision_ref ?? null,
          xref.target_document_id, xref.target_provision_ref ?? null,
          xref.ref_type
        );
      }
      console.log(`  Loaded ${xrefs.length} cross-references`);
    }
  });

  loadAll();

  db.pragma('wal_checkpoint(TRUNCATE)');
  db.exec('ANALYZE');
  db.close();

  const size = fs.statSync(DB_PATH).size;
  console.log(
    `\nBuild complete: ${totalDocs} documents, ${totalProvisions} provisions, ` +
    `${totalProvisionVersions} provision versions, ${totalDefs} definitions`
  );
  if (totalDuplicateRefs > 0) {
    console.log(
      `Data quality: ${totalDuplicateRefs} duplicate refs detected ` +
      `(${totalConflictingDuplicates} with conflicting text).`
    );
  }
  console.log(`Output: ${DB_PATH} (${(size / 1024).toFixed(1)} KB)`);
}

buildDatabase();
