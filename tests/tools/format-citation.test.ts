import { describe, it, expect } from 'vitest';
import { formatCitationTool } from '../../src/tools/format-citation.js';

describe('format_citation tool', () => {
  it('should format a valid SFS citation', async () => {
    const result = await formatCitationTool({
      citation: 'SFS 2018:218 3 kap. 5 §',
    });

    expect(result.valid).toBe(true);
    expect(result.type).toBe('statute');
    expect(result.formatted).toBe('SFS 2018:218 3 kap. 5 §');
  });

  it('should format in short mode', async () => {
    const result = await formatCitationTool({
      citation: 'SFS 2018:218 3 kap. 5 §',
      format: 'short',
    });

    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('2018:218 3:5');
  });

  it('should format in pinpoint mode', async () => {
    const result = await formatCitationTool({
      citation: 'SFS 2018:218 3 kap. 5 §',
      format: 'pinpoint',
    });

    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('3 kap. 5 §');
  });

  it('should format a proposition', async () => {
    const result = await formatCitationTool({
      citation: 'Prop. 2017/18:105',
    });

    expect(result.valid).toBe(true);
    expect(result.type).toBe('bill');
    expect(result.formatted).toBe('Prop. 2017/18:105');
  });

  it('should handle empty citation', async () => {
    const result = await formatCitationTool({ citation: '' });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Empty citation');
  });

  it('should handle invalid citation', async () => {
    const result = await formatCitationTool({ citation: 'not a citation' });

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
