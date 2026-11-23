import { describe, expect, it } from 'vitest';
import { lexiconSentiment } from './sentiment';

describe('lexicon sentiment fallback', () => {
  it('scores hazardous reports negative', () => {
    expect(lexiconSentiment('Terrible smoke and burning, choking and dangerous')).toBeLessThan(
      -0.5,
    );
  });

  it('scores positive community initiatives above zero', () => {
    expect(lexiconSentiment('Great initiative, clean and happy community success')).toBeGreaterThan(
      0.5,
    );
  });

  it('returns a neutral score for empty or factual text', () => {
    expect(lexiconSentiment('')).toBe(0);
    expect(lexiconSentiment('The monitor is at 28.61 north')).toBe(0);
  });

  it('stays within [-1, 1]', () => {
    const extreme = lexiconSentiment(Array(50).fill('toxic').join(' '));
    expect(extreme).toBeGreaterThanOrEqual(-1);
    expect(extreme).toBeLessThanOrEqual(1);
  });
});
