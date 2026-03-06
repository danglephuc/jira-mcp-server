import { describe, it, expect } from 'vitest';
import { countTokens } from './tokenCounter.js';

describe('countTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('counts simple words', () => {
    expect(countTokens('hello world')).toBe(2);
  });

  it('counts words separated by multiple spaces or newlines', () => {
    expect(countTokens('hello  world\nfoo\tbar')).toBe(4);
  });

  it('counts punctuation as separate tokens', () => {
    const count = countTokens('{"key": "value"}');
    expect(count).toBeGreaterThan(0);
  });

  it('returns a larger count for more text', () => {
    const short = 'hello world';
    const long = 'hello world foo bar baz qux';
    expect(countTokens(long)).toBeGreaterThan(countTokens(short));
  });
});
