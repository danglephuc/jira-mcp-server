import { describe, it, expect, vi } from 'vitest';
import { wrapWithTokenLimit } from './wrapWithTokenLimit.js';

describe('wrapWithTokenLimit', () => {
  it('passes through error results unchanged', async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ kind: 'error', message: 'something failed' });
    const wrapped = wrapWithTokenLimit(fn, 1000);

    const result = await wrapped({} as never);

    expect(result).toEqual({ kind: 'error', message: 'something failed' });
  });

  it('serialises ok results as JSON text', async () => {
    const data = { issues: [{ id: '10001' }] };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data });
    const wrapped = wrapWithTokenLimit(fn, 100_000);

    const result = await wrapped({} as never);

    expect(result).toEqual({
      kind: 'ok',
      data: JSON.stringify(data, null, 2),
    });
  });

  it('truncates output when token count exceeds the limit', async () => {
    const bigData = { items: new Array(10_000).fill('word') };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: bigData });
    const wrapped = wrapWithTokenLimit(fn, 5);

    const result = await wrapped({} as never);

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(String(result.data)).toContain(
        '...(output truncated due to token limit)'
      );
    }
  });

  it('does not truncate output that fits within the limit', async () => {
    const smallData = { id: '10001' };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: smallData });
    const wrapped = wrapWithTokenLimit(fn, 100_000);

    const result = await wrapped({} as never);

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(String(result.data)).not.toContain('truncated');
    }
  });
});
