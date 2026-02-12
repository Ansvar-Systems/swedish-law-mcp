import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { checkCurrency } from '../../src/tools/check-currency.js';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('check_currency', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('should return currency info for in-force statute', async () => {
    const result = await checkCurrency(db, { document_id: '2018:218' });

    expect(result).not.toBeNull();
    expect(result!.document_id).toBe('2018:218');
    expect(result!.status).toBe('in_force');
    expect(result!.is_current).toBe(true);
    expect(result!.warnings).toHaveLength(0);
  });

  it('should warn about repealed statute', async () => {
    const result = await checkCurrency(db, { document_id: '1998:204' });

    expect(result).not.toBeNull();
    expect(result!.status).toBe('repealed');
    expect(result!.is_current).toBe(false);
    expect(result!.warnings.some(w => w.includes('repealed'))).toBe(true);
  });

  it('should check provision existence', async () => {
    const result = await checkCurrency(db, {
      document_id: '2018:218',
      provision_ref: '1:1',
    });

    expect(result).not.toBeNull();
    expect(result!.provision_exists).toBe(true);
  });

  it('should warn about non-existent provision', async () => {
    const result = await checkCurrency(db, {
      document_id: '2018:218',
      provision_ref: '99:99',
    });

    expect(result).not.toBeNull();
    expect(result!.provision_exists).toBe(false);
    expect(result!.warnings.some(w => w.includes('not found'))).toBe(true);
  });

  it('should return null for non-existent document', async () => {
    const result = await checkCurrency(db, { document_id: '9999:999' });
    expect(result).toBeNull();
  });

  it('should throw for missing document_id', async () => {
    await expect(
      checkCurrency(db, { document_id: '' })
    ).rejects.toThrow('document_id is required');
  });

  it('should compute historical status for as_of_date', async () => {
    const result = await checkCurrency(db, {
      document_id: '1998:204',
      as_of_date: '2007-01-01',
    });

    expect(result).not.toBeNull();
    expect(result!.status_as_of).toBe('in_force');
    expect(result!.is_in_force_as_of).toBe(true);
  });

  it('should compute historical repeal for as_of_date after repeal date', async () => {
    const result = await checkCurrency(db, {
      document_id: '1998:204',
      as_of_date: '2020-01-01',
    });

    expect(result).not.toBeNull();
    expect(result!.status_as_of).toBe('repealed');
    expect(result!.is_in_force_as_of).toBe(false);
  });
});
