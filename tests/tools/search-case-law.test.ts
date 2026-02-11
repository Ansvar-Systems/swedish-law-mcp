import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { searchCaseLaw } from '../../src/tools/search-case-law.js';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('search_case_law', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('should find case law by keyword', async () => {
    const results = await searchCaseLaw(db, { query: 'personuppgifter' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('document_id');
    expect(results[0]).toHaveProperty('court');
    expect(results[0]).toHaveProperty('summary_snippet');
  });

  it('should filter by court', async () => {
    const results = await searchCaseLaw(db, {
      query: 'personuppgifter',
      court: 'HD',
    });
    for (const r of results) {
      expect(r.court).toBe('HD');
    }
  });

  it('should filter by date range', async () => {
    const results = await searchCaseLaw(db, {
      query: 'personuppgifter',
      date_from: '2020-01-01',
    });
    for (const r of results) {
      if (r.decision_date) {
        expect(r.decision_date >= '2020-01-01').toBe(true);
      }
    }
  });

  it('should return empty array for empty query', async () => {
    const results = await searchCaseLaw(db, { query: '' });
    expect(results).toEqual([]);
  });

  it('should respect limit', async () => {
    const results = await searchCaseLaw(db, {
      query: 'personuppgifter',
      limit: 1,
    });
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
