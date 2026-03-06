import { describe, it, expect, vi } from 'vitest';
import { runToolSafely } from './runToolSafely.js';
import { JiraApiError } from '../jira/client.js';

describe('runToolSafely', () => {
  it('wraps a successful result in { kind: "ok", data }', async () => {
    const fn = vi.fn().mockResolvedValue({ issues: [] });
    const safe = runToolSafely(fn);

    const result = await safe('input' as never);

    expect(result).toEqual({ kind: 'ok', data: { issues: [] } });
  });

  it('catches a JiraApiError and returns an error result with status and body', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(
        new JiraApiError(404, { errorMessages: ['Issue does not exist'] })
      );
    const safe = runToolSafely(fn);

    const result = await safe({} as never);

    expect(result).toMatchObject({
      kind: 'error',
      message: 'Jira API error: 404',
      status: 404,
      details: { errorMessages: ['Issue does not exist'] },
    });
  });

  it('catches a generic Error and returns an error result with the message', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network failed'));
    const safe = runToolSafely(fn);

    const result = await safe({} as never);

    expect(result).toEqual({ kind: 'error', message: 'network failed' });
  });

  it('catches an unknown thrown value and returns a generic error result', async () => {
    const fn = vi.fn().mockRejectedValue('just a string error');
    const safe = runToolSafely(fn);

    const result = await safe({} as never);

    expect(result).toEqual({ kind: 'error', message: 'Unknown error' });
  });

  it('uses the custom onError handler when provided', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('something bad'));
    const onError = vi
      .fn()
      .mockReturnValue({ kind: 'error', message: 'custom' });
    const safe = runToolSafely(fn, onError);

    const result = await safe({} as never);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ kind: 'error', message: 'custom' });
  });

  it('passes the input through to the wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const safe = runToolSafely(fn);
    const input = { id: 42 };

    await safe(input as never);

    expect(fn).toHaveBeenCalledWith(input);
  });
});
