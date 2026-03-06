import { describe, it, expect, vi } from 'vitest';
import { wrapWithToolResult } from './wrapWithToolResult.js';

describe('wrapWithToolResult', () => {
  it('returns a text content result for a successful string result', async () => {
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data: 'some text' });
    const wrapped = wrapWithToolResult(fn);

    const result = await wrapped({} as never, {} as never);

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({ type: 'text', text: 'some text' });
  });

  it('serialises non-string data as JSON', async () => {
    const data = { id: '10001', key: 'PROJ-1' };
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', data });
    const wrapped = wrapWithToolResult(fn);

    const result = await wrapped({} as never, {} as never);

    expect((result.content[0] as { type: 'text'; text: string }).text).toBe(
      JSON.stringify(data, null, 2)
    );
  });

  it('returns isError=true for an error result', async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ kind: 'error', message: 'Not found' });
    const wrapped = wrapWithToolResult(fn);

    const result = await wrapped({} as never, {} as never);

    expect(result.isError).toBe(true);
    expect(result.content[0]).toEqual({ type: 'text', text: 'Not found' });
  });
});
