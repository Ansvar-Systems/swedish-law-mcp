#!/usr/bin/env tsx
/**
 * Riksdagen Data Ingestion Script
 *
 * Fetches Swedish statutes from Riksdagen's open data API and converts
 * them to seed JSON format for the Swedish Legal Citation MCP server.
 *
 * Pipeline:
 *   Riksdagen API -> ingest-riksdagen.ts -> data/seed/{sfs}.json -> build-db.ts -> database.db
 *
 * Usage:
 *   npm run ingest -- <sfs-number> <output-path>
 *
 * Examples:
 *   npm run ingest -- 2018:218 data/seed/2018_218.json
 *   npm run ingest -- 1998:204 data/seed/1998_204.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const RIKSDAGEN_DOC_URL = 'https://data.riksdagen.se/dokument';
const RIKSDAGEN_LIST_URL = 'https://data.riksdagen.se/dokumentlista';
const REQUEST_DELAY_MS = 500;
const USER_AGENT = 'Swedish-Law-MCP/0.1.0 (https://github.com/Ansvar-Systems/swedish-law-mcp)';

/** Known statutes with metadata for enrichment */
const KNOWN_STATUTES: Record<string, StatuteMetadata> = {
  '2018:218': {
    short_name: 'DSL',
    title_en: 'Act with supplementary provisions to the EU GDPR',
    in_force_date: '2018-05-25',
  },
  '1962:700': {
    short_name: 'BrB',
    title_en: 'The Swedish Criminal Code',
    in_force_date: '1965-01-01',
  },
  '2009:400': {
    short_name: 'OSL',
    title_en: 'Public Access to Information and Secrecy Act',
    in_force_date: '2009-06-30',
  },
  '1977:1160': {
    short_name: 'AML',
    title_en: 'Work Environment Act',
    in_force_date: '1978-07-01',
  },
  '1998:204': {
    short_name: 'PUL',
    title_en: 'Personal Data Act',
    in_force_date: '1998-10-24',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StatuteMetadata {
  short_name?: string;
  title_en?: string;
  in_force_date?: string;
}

interface RiksdagenDocument {
  dok_id: string;
  rm: string;
  beteckning: string;
  typ: string;
  doktyp: string;
  titel: string;
  undertitel?: string;
  datum: string;
  publicerad?: string;
  html_url?: string;
  text?: string;
}

interface SeedOutput {
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
  provisions?: ProvisionOutput[];
  definitions?: DefinitionOutput[];
}

interface ProvisionOutput {
  provision_ref: string;
  chapter?: string;
  section: string;
  title?: string;
  content: string;
}

interface DefinitionOutput {
  term: string;
  definition: string;
  source_provision?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetching
// ─────────────────────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
  }

  return response.json();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

const CHAPTER_PATTERN = /^(\d+)\s*kap\.\s*(.*)/;
const SECTION_PATTERN = /^(\d+\s*[a-z]?)\s*\u00a7\s*(.*)/;

function parseProvisions(text: string): ProvisionOutput[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const provisions: ProvisionOutput[] = [];

  let currentChapter: string | undefined;
  let currentSection: string | undefined;
  let currentTitle: string | undefined;
  let currentContent: string[] = [];

  function flush(): void {
    if (currentSection && currentContent.length > 0) {
      const section = currentSection.replace(/\s+/g, ' ').trim();
      const provisionRef = currentChapter ? `${currentChapter}:${section}` : section;

      provisions.push({
        provision_ref: provisionRef,
        chapter: currentChapter,
        section,
        title: currentTitle,
        content: currentContent.join(' '),
      });
    }
    currentSection = undefined;
    currentTitle = undefined;
    currentContent = [];
  }

  for (const line of lines) {
    const chapterMatch = line.match(CHAPTER_PATTERN);
    if (chapterMatch) {
      flush();
      currentChapter = chapterMatch[1];
      continue;
    }

    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      flush();
      currentSection = sectionMatch[1];
      const remainder = sectionMatch[2].trim();
      if (remainder) {
        currentContent.push(remainder);
      }
      continue;
    }

    // Rubrik detection: short line, starts with uppercase, no section content yet
    if (currentSection && currentContent.length === 0 && /^[A-Z\u00C0-\u00D6\u00D8-\u00DE]/.test(line) && line.length < 80) {
      currentTitle = line;
      continue;
    }

    if (currentSection) {
      currentContent.push(line);
    }
  }

  flush();
  return provisions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ingestion
// ─────────────────────────────────────────────────────────────────────────────

async function ingest(sfsNumber: string, outputPath: string): Promise<void> {
  console.log('Riksdagen Data Ingestion');
  console.log(`  SFS: ${sfsNumber}`);
  console.log(`  Output: ${outputPath}`);
  console.log('');

  // Step 1: Fetch document metadata from Riksdagen
  console.log('Fetching document list from Riksdagen...');
  const listUrl = `${RIKSDAGEN_LIST_URL}/?sok=${encodeURIComponent(sfsNumber)}&doktyp=sfs&format=json&utformat=json`;

  const listData = await fetchJson(listUrl) as { dokumentlista?: { dokument?: RiksdagenDocument[] } };
  const documents = listData?.dokumentlista?.dokument ?? [];

  if (documents.length === 0) {
    console.error(`No documents found for SFS ${sfsNumber}`);
    process.exit(1);
  }

  const doc = documents[0];
  console.log(`  Found: ${doc.titel}`);

  await delay(REQUEST_DELAY_MS);

  // Step 2: Fetch full document text
  console.log('Fetching document text...');
  const docUrl = `${RIKSDAGEN_DOC_URL}/${doc.dok_id}.json`;
  const docData = await fetchJson(docUrl) as { dokumentstatus?: { dokument?: RiksdagenDocument } };
  const fullDoc = docData?.dokumentstatus?.dokument;

  if (!fullDoc) {
    console.error('Could not retrieve document details');
    process.exit(1);
  }

  const rawText = fullDoc.text || '';
  console.log(`  Text length: ${rawText.length} chars`);

  // Step 3: Parse provisions
  console.log('Parsing provisions...');
  const provisions = parseProvisions(rawText);
  console.log(`  Found ${provisions.length} provisions`);

  // Step 4: Build seed output
  const known = KNOWN_STATUTES[sfsNumber];

  const seed: SeedOutput = {
    id: sfsNumber,
    type: 'statute',
    title: doc.titel || `SFS ${sfsNumber}`,
    title_en: known?.title_en,
    short_name: known?.short_name,
    status: 'in_force',
    issued_date: doc.datum,
    in_force_date: known?.in_force_date,
    url: doc.html_url || `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/sfs-${sfsNumber.replace(':', '-')}`,
    provisions: provisions.length > 0 ? provisions : undefined,
  };

  // Step 5: Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(seed, null, 2));

  const fileSize = fs.statSync(outputPath).size;
  console.log('');
  console.log('Ingestion complete:');
  console.log(`  Document: ${seed.title}`);
  console.log(`  Provisions: ${provisions.length}`);
  console.log(`  Output: ${outputPath} (${(fileSize / 1024).toFixed(1)} KB)`);
  console.log('');
  console.log('Next step: npm run build:db');
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npm run ingest -- <sfs-number> <output-path>');
  console.log('');
  console.log('Examples:');
  console.log('  npm run ingest -- 2018:218 data/seed/2018_218.json');
  console.log('  npm run ingest -- 1998:204 data/seed/1998_204.json');
  console.log('');
  console.log('Known statutes:');
  for (const [sfs, meta] of Object.entries(KNOWN_STATUTES)) {
    console.log(`  ${sfs} (${meta.short_name || 'no short name'})`);
  }
  process.exit(1);
}

ingest(args[0], args[1]).catch(error => {
  console.error('Ingestion failed:', error.message);
  process.exit(1);
});
