import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { getProvision } from '../../src/tools/get-provision.js';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('get_provision', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('should get a specific provision by chapter and section', async () => {
    const result = await getProvision(db, {
      document_id: '2018:218',
      chapter: '1',
      section: '1',
    });

    expect(result).not.toBeNull();
    expect(result).not.toBeInstanceOf(Array);
    const prov = result as Exclude<typeof result, null | Array<unknown>>;
    expect(prov.provision_ref).toBe('1:1');
    expect(prov.content).toContain('dataskyddsförordning');
    expect(prov.title).toBe('Lagens syfte');
  });

  it('should get a provision by provision_ref directly', async () => {
    const result = await getProvision(db, {
      document_id: '2018:218',
      provision_ref: '3:1',
    });

    expect(result).not.toBeNull();
    const prov = result as Exclude<typeof result, null | Array<unknown>>;
    expect(prov.provision_ref).toBe('3:1');
    expect(prov.title).toBe('Tillsynsmyndighet');
  });

  it('should get a flat statute provision', async () => {
    const result = await getProvision(db, {
      document_id: '1998:204',
      section: '5 a',
    });

    expect(result).not.toBeNull();
    const prov = result as Exclude<typeof result, null | Array<unknown>>;
    expect(prov.provision_ref).toBe('5 a');
    expect(prov.title).toBe('Missbruksregeln');
    expect(prov.content).toContain('personuppgifter');
  });

  it('should return all provisions when no specific one requested', async () => {
    const result = await getProvision(db, { document_id: '2018:218' });

    expect(Array.isArray(result)).toBe(true);
    const provisions = result as Array<unknown>;
    expect(provisions.length).toBe(8); // 8 sample provisions for 2018:218
  });

  it('should return null for non-existent provision', async () => {
    const result = await getProvision(db, {
      document_id: '2018:218',
      provision_ref: '99:99',
    });

    expect(result).toBeNull();
  });

  it('should include cross-references', async () => {
    const result = await getProvision(db, {
      document_id: '2018:218',
      provision_ref: '1:1',
    });

    expect(result).not.toBeNull();
    const prov = result as Exclude<typeof result, null | Array<unknown>>;
    expect(prov.cross_references).toBeDefined();
    expect(prov.cross_references.length).toBeGreaterThan(0);
  });

  it('should throw for missing document_id', async () => {
    await expect(
      getProvision(db, { document_id: '' })
    ).rejects.toThrow('document_id is required');
  });
});
