import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { getPreparatoryWorks } from '../../src/tools/get-preparatory-works.js';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('get_preparatory_works', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('should return preparatory works for a statute', async () => {
    const results = await getPreparatoryWorks(db, { document_id: '2018:218' });

    expect(results.length).toBe(2); // Prop. and SOU
    expect(results[0]).toHaveProperty('statute_id', '2018:218');
    expect(results[0]).toHaveProperty('prep_document_id');
    expect(results[0]).toHaveProperty('prep_title');
  });

  it('should include both propositions and SOUs', async () => {
    const results = await getPreparatoryWorks(db, { document_id: '2018:218' });

    const types = results.map(r => r.prep_type);
    expect(types).toContain('bill');
    expect(types).toContain('sou');
  });

  it('should return empty array for statute with no preparatory works', async () => {
    const results = await getPreparatoryWorks(db, { document_id: '1998:204' });
    expect(results).toEqual([]);
  });

  it('should throw for missing document_id', async () => {
    await expect(
      getPreparatoryWorks(db, { document_id: '' })
    ).rejects.toThrow('document_id is required');
  });
});
