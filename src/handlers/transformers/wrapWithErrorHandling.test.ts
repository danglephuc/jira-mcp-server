import { describe, it, expect, vi } from 'vitest';
import { wrapWithErrorHandling } from './wrapWithErrorHandling.js';
import { JiraApiError } from '../../jira/client.js';

describe('wrapWithErrorHandling', () => {
  it('returns { kind: "ok", data } for a successful function', async () => {
    const fn = vi.fn().mockResolvedValue({ issues: [] });
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toEqual({ kind: 'ok', data: { issues: [] } });
  });

  it('returns an error result for a JiraApiError', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(
        new JiraApiError(403, { errorMessages: ['Forbidden'] })
      );
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toMatchObject({
      kind: 'error',
      status: 403,
    });
  });

  it('returns an error result for a generic Error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('something failed'));
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped({} as never);

    expect(result).toEqual({ kind: 'error', message: 'something failed' });
  });

  it('uses a custom onError handler when provided', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('bad'));
    const onError = vi
      .fn()
      .mockReturnValue({ kind: 'error', message: 'custom error' });
    const wrapped = wrapWithErrorHandling(fn, onError);

    const result = await wrapped({} as never);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ kind: 'error', message: 'custom error' });
  });
});
