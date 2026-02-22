#!/usr/bin/env tsx
/**
 * Automated Bulk Ingestion of Swedish Statutes
 *
 * Fetches SFS documents from the Riksdagen API, supports multiple scope modes,
 * and ingests missing statutes into data/seed/.
 *
 * Usage:
 *   tsx scripts/auto-ingest-all-statutes.ts [--scope major|all-laws|all-laws-no-amendments|all-sfs]
 *                                          [--start N] [--limit N]
 *                                          [--year-start YYYY] [--year-end YYYY]
 *                                          [--dry-run] [--no-skip]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ingest } from './ingest-riksdagen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RIKSDAGEN_LIST_URL = 'https://data.riksdagen.se/dokumentlista';
const OUTPUT_DIR = path.resolve(__dirname, '../data/seed');
const LIST_REQUEST_DELAY_MS = 1000;
const INGEST_REQUEST_DELAY_MS = 1000;
const DEFAULT_PAGE_SIZE = 500; // API currently caps to 200 entries/page

type IngestionScope = 'major' | 'all-laws' | 'all-laws-no-amendments' | 'all-sfs';

interface CLIOptions {
  limit?: number;
  start: number;
  yearStart?: number;
  yearEnd?: number;
  pageSize: number;
  scope: IngestionScope;
  dryRun: boolean;
  skipExisting: boolean;
}

interface SFSDocument {
  dok_id?: string;
  beteckning: string; // e.g., "2018:218"
  titel: string;
  datum: string;
  organ: string;
  summary?: string;
  html_url?: string;
}

interface IngestionStats {
  total: number;
  skipped: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    start: 1,
    scope: 'major',
    pageSize: DEFAULT_PAGE_SIZE,
    dryRun: false,
    skipExisting: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--start':
        options.start = parseInt(args[++i], 10);
        break;
      case '--year-start':
        options.yearStart = parseInt(args[++i], 10);
        break;
      case '--year-end':
        options.yearEnd = parseInt(args[++i], 10);
        break;
      case '--page-size':
        options.pageSize = parseInt(args[++i], 10);
        break;
      case '--scope': {
        const scope = args[++i] as IngestionScope;
        if (scope === 'major' || scope === 'all-laws' || scope === 'all-laws-no-amendments' || scope === 'all-sfs') {
          options.scope = scope;
        } else {
          throw new Error(`Invalid --scope value: ${scope}`);
        }
        break;
      }
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-skip':
        options.skipExisting = false;
        break;
    }
  }

  if (Number.isNaN(options.start) || options.start < 1) {
    throw new Error(`Invalid --start value: ${options.start}`);
  }

  if (options.limit != null && (Number.isNaN(options.limit) || options.limit < 1)) {
    throw new Error(`Invalid --limit value: ${options.limit}`);
  }

  if (Number.isNaN(options.pageSize) || options.pageSize < 1) {
    throw new Error(`Invalid --page-size value: ${options.pageSize}`);
  }

  return options;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function extractXMLTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXmlEntities(match[1]) : undefined;
}

function extractXmlAttr(xml: string, attr: string): string | undefined {
  const match = xml.match(new RegExp(`${attr}="([^"]+)"`, 'i'));
  return match ? decodeXmlEntities(match[1]) : undefined;
}

function normalizeRiksdagenUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `https://data.riksdagen.se${value}`;
  return value;
}

function parseRiksdagenXML(xml: string): SFSDocument[] {
  const documents: SFSDocument[] = [];
  const docMatches = xml.matchAll(/<dokument>[\s\S]*?<\/dokument>/g);

  for (const match of docMatches) {
    const docXml = match[0];

    const dok_id = extractXMLTag(docXml, 'dok_id') || extractXMLTag(docXml, 'id');
    const beteckning = extractXMLTag(docXml, 'beteckning');
    const titel = extractXMLTag(docXml, 'titel');
    const datum = extractXMLTag(docXml, 'datum');
    const organ = extractXMLTag(docXml, 'organ');
    const summary = extractXMLTag(docXml, 'summary');
    const htmlUrl = normalizeRiksdagenUrl(
      extractXMLTag(docXml, 'html_url') || extractXMLTag(docXml, 'dokument_url_html')
    );

    if (beteckning && titel) {
      documents.push({
        dok_id,
        beteckning,
        titel,
        datum: datum || '',
        organ: organ || '',
        summary,
        html_url: htmlUrl,
      });
    }
  }

  return documents;
}

function parseDocDate(value: string): number {
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return 0;
  const ts = Date.parse(`${match[0]}T00:00:00Z`);
  return Number.isNaN(ts) ? 0 : ts;
}

function dedupeByBeteckning(documents: SFSDocument[]): SFSDocument[] {
  const byId = new Map<string, SFSDocument>();

  for (const doc of documents) {
    const existing = byId.get(doc.beteckning);
    if (!existing) {
      byId.set(doc.beteckning, doc);
      continue;
    }

    const existingDate = parseDocDate(existing.datum);
    const nextDate = parseDocDate(doc.datum);
    if (nextDate > existingDate) {
      byId.set(doc.beteckning, doc);
    }
  }

  return [...byId.values()];
}

async function fetchAllSFSDocuments(options: CLIOptions): Promise<{ rows: SFSDocument[]; totalRows: number; totalPages: number }> {
  const rows: SFSDocument[] = [];
  let page = 1;
  let totalPages = 1;
  let totalRows = 0;

  console.log('Fetching SFS document list from Riksdagen API...\n');

  while (page <= totalPages) {
    const yearFilter = options.yearStart && options.yearEnd
      ? `&utdatumfrom=${options.yearStart}-01-01&utdatumtom=${options.yearEnd}-12-31`
      : '';

    const url = `${RIKSDAGEN_LIST_URL}/?doktyp=sfs&format=json&sz=${options.pageSize}&p=${page}${yearFilter}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Swedish-Law-MCP/1.0 auto-ingest-all-statutes',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: HTTP ${response.status}`);
    }

    const text = await response.text();
    if (page === 1) {
      totalPages = Number(extractXmlAttr(text, 'sidor') ?? '1');
      totalRows = Number(extractXmlAttr(text, 'traffar') ?? '0');
      if (Number.isNaN(totalPages) || totalPages < 1) totalPages = 1;
      if (Number.isNaN(totalRows) || totalRows < 0) totalRows = 0;
      console.log(`Discovered ${totalRows} SFS rows across ${totalPages} pages\n`);
    }

    const docs = parseRiksdagenXML(text);
    rows.push(...docs);

    if (page % 5 === 0 || page === totalPages) {
      console.log(`Fetched page ${page}/${totalPages}: +${docs.length} rows (total ${rows.length})`);
    }

    page++;
    if (page <= totalPages) {
      await sleep(LIST_REQUEST_DELAY_MS);
    }
  }

  return { rows, totalRows, totalPages };
}

function isAmendmentTitle(title: string): boolean {
  return /ändr|ändring|upph|upphävande|omtryck/i.test(title);
}

function isLawLikeTitle(title: string): boolean {
  const isLaw = /\blag\b|\bbalken?\b/i.test(title);
  const isConstitutionalOrdinance = /tryckfrihetsförordningen|regeringsformen|successionsordningen|riksdagsordningen/i.test(title);
  return isLaw || isConstitutionalOrdinance;
}

function filterMajorLaws(documents: SFSDocument[]): SFSDocument[] {
  return documents.filter(doc => {
    if (isAmendmentTitle(doc.titel)) return false;
    if (doc.titel.length < 20) return false;
    if (/tillkännagivande|kungörelse/i.test(doc.titel)) return false;
    return isLawLikeTitle(doc.titel);
  });
}

function filterByScope(documents: SFSDocument[], scope: IngestionScope): SFSDocument[] {
  switch (scope) {
    case 'all-sfs':
      return documents;
    case 'all-laws':
      return documents.filter(doc => isLawLikeTitle(doc.titel));
    case 'all-laws-no-amendments':
      return documents.filter(doc => isLawLikeTitle(doc.titel) && !isAmendmentTitle(doc.titel));
    case 'major':
    default:
      return filterMajorLaws(documents);
  }
}

function getExistingStatuteIds(): Set<string> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return new Set();
  }

  const files = fs.readdirSync(OUTPUT_DIR);
  const ids = new Set<string>();

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const fullPath = path.join(OUTPUT_DIR, file);
    try {
      const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as { id?: string; type?: string };
      if (parsed?.type === 'statute' && typeof parsed.id === 'string') {
        ids.add(parsed.id);
        continue;
      }
    } catch {
      // Fall back to filename parsing below.
    }

    const match = file.match(/^(\d{4})[-_](\d+)\.json$/);
    if (match) {
      ids.add(`${match[1]}:${match[2]}`);
    }
  }

  return ids;
}

function safeFileName(sfsNumber: string): string {
  return sfsNumber.replace(/[:\s/\\]+/g, '_');
}

function selectWindow<T>(items: T[], start: number, limit?: number): T[] {
  const startIndex = Math.max(0, start - 1);
  const fromStart = items.slice(startIndex);
  return limit ? fromStart.slice(0, limit) : fromStart;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ingestBatch(
  documents: SFSDocument[],
  options: CLIOptions,
  existing: Set<string>
): Promise<IngestionStats> {
  const stats: IngestionStats = {
    total: documents.length,
    skipped: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\nIngesting ${documents.length} statutes...\n`);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const sfsNumber = doc.beteckning;
    const progress = i + 1;
    const shouldLogProgress = progress % 25 === 0 || progress === documents.length;

    if (options.skipExisting && existing.has(sfsNumber)) {
      stats.skipped++;
      if (shouldLogProgress) {
        console.log(
          `[${progress}/${documents.length}] progress: ` +
          `ok=${stats.succeeded} skipped=${stats.skipped} failed=${stats.failed}`
        );
      }
      continue;
    }

    const outputPath = path.join(OUTPUT_DIR, `${safeFileName(sfsNumber)}.json`);

    if (options.dryRun) {
      stats.succeeded++;
      if (shouldLogProgress) {
        console.log(
          `[${progress}/${documents.length}] dry-run progress: ` +
          `would_ingest=${stats.succeeded} skipped=${stats.skipped}`
        );
      }
      continue;
    }

    try {
      if (doc.dok_id) {
        await ingest(sfsNumber, outputPath, {
          documentId: doc.dok_id,
          title: doc.titel,
          issuedDate: doc.datum,
          htmlUrl: doc.html_url,
          quiet: true,
        });
      } else {
        // Fallback path for legacy records lacking dok_id in list feed.
        await ingest(sfsNumber, outputPath, { quiet: true });
      }

      stats.succeeded++;
      if (shouldLogProgress) {
        console.log(
          `[${progress}/${documents.length}] progress: ` +
          `ok=${stats.succeeded} skipped=${stats.skipped} failed=${stats.failed} ` +
          `last_ok=${sfsNumber}`
        );
      }
      await sleep(INGEST_REQUEST_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${progress}/${documents.length}] FAIL ${sfsNumber} - ${message}`);
      stats.failed++;
      stats.errors.push({ id: sfsNumber, error: message });
    }
  }

  return stats;
}

function printStats(stats: IngestionStats, options: CLIOptions): void {
  console.log('\n' + '='.repeat(72));
  console.log('INGESTION COMPLETE');
  console.log('='.repeat(72));
  console.log(`Scope:                    ${options.scope}`);
  console.log(`Window start:             ${options.start}`);
  console.log(`Window limit:             ${options.limit ?? 'none'}`);
  console.log(`Total statutes processed: ${stats.total}`);
  console.log(`Skipped (already exist):  ${stats.skipped}`);
  console.log(`Successfully ingested:    ${stats.succeeded}`);
  console.log(`Failed:                   ${stats.failed}`);
  console.log('='.repeat(72));

  if (stats.failed > 0) {
    console.log('\nFailed ingestions:');
    for (const error of stats.errors) {
      console.log(`  - ${error.id}: ${error.error}`);
    }
  }

  if (options.dryRun) {
    console.log('\n[DRY RUN MODE - No files were actually created]');
  }
}

async function run(): Promise<void> {
  const options = parseArgs();

  console.log('Automated Swedish Law Ingestion');
  console.log('================================\n');
  console.log(`Scope: ${options.scope}`);
  console.log(`Year range: ${options.yearStart || 'all'} - ${options.yearEnd || 'all'}`);
  console.log(`Start: ${options.start}`);
  console.log(`Limit: ${options.limit || 'none'}`);
  console.log(`Page size: ${options.pageSize}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`Skip existing: ${options.skipExisting ? 'YES' : 'NO'}\n`);

  const fetched = await fetchAllSFSDocuments(options);
  const unique = dedupeByBeteckning(fetched.rows);
  const scoped = filterByScope(unique, options.scope);
  const selected = selectWindow(scoped, options.start, options.limit);

  console.log(`\nFetched rows: ${fetched.rows.length} (API reported ${fetched.totalRows})`);
  console.log(`Unique SFS IDs: ${unique.length}`);
  console.log(`Scoped statutes (${options.scope}): ${scoped.length}`);
  console.log(`Selected window: ${selected.length}`);

  const existing = getExistingStatuteIds();
  const scopedCoveredBefore = scoped.filter(doc => existing.has(doc.beteckning)).length;
  const selectedCoveredBefore = selected.filter(doc => existing.has(doc.beteckning)).length;
  console.log(`\nExisting statute seeds (all): ${existing.size}`);
  console.log(`Coverage before (scope): ${scopedCoveredBefore}/${scoped.length}`);
  console.log(`Coverage before (selected window): ${selectedCoveredBefore}/${selected.length}\n`);

  const stats = await ingestBatch(selected, options, existing);
  printStats(stats, options);

  if (!options.dryRun) {
    const after = getExistingStatuteIds();
    const scopedCoveredAfter = scoped.filter(doc => after.has(doc.beteckning)).length;
    console.log(`\nCoverage after (scope): ${scopedCoveredAfter}/${scoped.length}`);
  }

  if (!options.dryRun && stats.succeeded > 0) {
    console.log('\nRun `npm run build:db` to rebuild the database with new statutes.');
  }
}

run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
