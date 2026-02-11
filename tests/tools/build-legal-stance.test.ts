import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { buildLegalStance } from '../../src/tools/build-legal-stance.js';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('build_legal_stance', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('should aggregate citations from multiple sources', async () => {
    const result = await buildLegalStance(db, { query: 'personuppgifter' });

    expect(result.query).toBe('personuppgifter');
    expect(result.provisions.length).toBeGreaterThan(0);
    expect(result.case_law.length).toBeGreaterThan(0);
    expect(result.total_citations).toBeGreaterThan(0);
    expect(result.total_citations).toBe(
      result.provisions.length + result.case_law.length + result.preparatory_works.length
    );
  });

  it('should filter provisions by document_id', async () => {
    const result = await buildLegalStance(db, {
      query: 'personuppgifter',
      document_id: '2018:218',
    });

    for (const prov of result.provisions) {
      expect(prov.document_id).toBe('2018:218');
    }
  });

  it('should exclude case law when requested', async () => {
    const result = await buildLegalStance(db, {
      query: 'personuppgifter',
      include_case_law: false,
    });

    expect(result.case_law).toEqual([]);
  });

  it('should exclude preparatory works when requested', async () => {
    const result = await buildLegalStance(db, {
      query: 'personuppgifter',
      include_preparatory_works: false,
    });

    expect(result.preparatory_works).toEqual([]);
  });

  it('should respect limit', async () => {
    const result = await buildLegalStance(db, {
      query: 'personuppgifter',
      limit: 1,
    });

    expect(result.provisions.length).toBeLessThanOrEqual(1);
    expect(result.case_law.length).toBeLessThanOrEqual(1);
  });

  it('should return empty results for empty query', async () => {
    const result = await buildLegalStance(db, { query: '' });

    expect(result.provisions).toEqual([]);
    expect(result.case_law).toEqual([]);
    expect(result.preparatory_works).toEqual([]);
    expect(result.total_citations).toBe(0);
  });
});
