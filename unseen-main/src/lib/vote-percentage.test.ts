import { describe, expect, it } from 'vitest';
import { formatVotePercentage } from './vote-percentage';

describe('vote percentage formatting', () => {
  it('uses the locale decimal separator and keeps hundredths', () => {
    expect(formatVotePercentage(33.33, 'it')).toBe('33,33');
    expect(formatVotePercentage(66.67, 'en')).toBe('66.67');
    expect(formatVotePercentage(50.05, 'de')).toBe('50,05');
  });

  it('keeps whole results compact and caps animation intermediates at two decimals', () => {
    expect(formatVotePercentage(0, 'it')).toBe('0');
    expect(formatVotePercentage(100, 'it')).toBe('100');
    expect(formatVotePercentage(33.333333, 'it')).toBe('33,33');
  });
});
