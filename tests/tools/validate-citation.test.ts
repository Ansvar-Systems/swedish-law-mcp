import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database } from 'better-sqlite3';
import { validateCitationTool } from '../../src/tools/validate-citation.js';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('validate_citation tool', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('should validate a fully valid citation', async () => {
    const result = await validateCitationTool(db, {
      citation: 'SFS 2018:218 1 kap. 1 §',
    });

    expect(result.valid).toBe(true);
    expect(result.document_exists).toBe(true);
    expect(result.provision_exists).toBe(true);
    expect(result.formatted_citation).toContain('2018:218');
    expect(result.warnings).toHaveLength(0);
  });

  it('should return warnings for repealed statute', async () => {
    const result = await validateCitationTool(db, {
      citation: 'SFS 1998:204 1 §',
    });

    expect(result.document_exists).toBe(true);
    expect(result.warnings.some(w => w.includes('repealed'))).toBe(true);
  });

  it('should handle empty citation', async () => {
    const result = await validateCitationTool(db, { citation: '' });

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('Empty citation');
  });

  it('should report non-existent document', async () => {
    const result = await validateCitationTool(db, {
      citation: 'SFS 9999:999',
    });

    expect(result.valid).toBe(false);
    expect(result.document_exists).toBe(false);
  });

  it('should report non-existent provision', async () => {
    const result = await validateCitationTool(db, {
      citation: 'SFS 2018:218 99 kap. 99 §',
    });

    expect(result.valid).toBe(false);
    expect(result.document_exists).toBe(true);
    expect(result.provision_exists).toBe(false);
  });
});
