import { describe, expect, it } from 'vitest';
import {
  extractEUReferences,
  extractInlineEUArticleReferences,
} from '../../src/parsers/eu-reference-parser.js';

describe('eu-reference-parser', () => {
  it('extracts and normalizes inline article references with parentheses', () => {
    const articles = extractInlineEUArticleReferences(
      'Behandling får ske med stöd av artikel 9.2(h) och 9.3 i EU:s dataskyddsförordning.'
    );

    expect(articles).toContain('9.2.h');
    expect(articles).toContain('9.3');
  });

  it('maps named GDPR references to regulation 2016/679', () => {
    const refs = extractEUReferences(
      'Personuppgifter får behandlas enligt artikel 9.2(h) och 9.3 i EU:s dataskyddsförordning.'
    );

    expect(refs.length).toBeGreaterThan(0);
    const gdprRef = refs.find(ref => ref.type === 'regulation' && ref.id === '2016/679');
    expect(gdprRef).toBeDefined();
    expect(gdprRef?.article).toContain('9.2.h');
    expect(gdprRef?.article).toContain('9.3');
  });
});
