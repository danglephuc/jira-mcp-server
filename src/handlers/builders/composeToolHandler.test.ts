import { describe, it, expect, vi } from 'vitest';
import { composeToolHandler } from './composeToolHandler.js';
import { JiraApiError } from '../../jira/client.js';
import type { ToolDefinition } from '../../types/tool.js';

const OPTIONS = { maxTokens: 100_000, prefix: '' };

function makeTool(handler: ToolDefinition['handler']): ToolDefinition {
  return {
    name: 'test_tool',
    description: 'A test tool',
    schema: { shape: {} } as never,
    handler,
  };
}

describe('composeToolHandler', () => {
  it('returns a CallToolResult with content text for a successful handler', async () => {
    const tool = makeTool(vi.fn().mockResolvedValue({ id: '10001' }));
    const handler = composeToolHandler(tool, OPTIONS);

    const result = await handler({} as never, {} as never);

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });

  it('serialises the handler return value as JSON text', async () => {
    const data = { issues: [{ id: '10001' }] };
    const tool = makeTool(vi.fn().mockResolvedValue(data));
    const handler = composeToolHandler(tool, OPTIONS);

    const result = await handler({} as never, {} as never);

    expect((result.content[0] as { type: 'text'; text: string }).text).toBe(
      JSON.stringify(data, null, 2)
    );
  });

  it('returns isError=true when the handler throws a JiraApiError', async () => {
    const tool = makeTool(
      vi
        .fn()
        .mockRejectedValue(
          new JiraApiError(404, { errorMessages: ['Issue does not exist'] })
        )
    );
    const handler = composeToolHandler(tool, OPTIONS);

    const result = await handler({} as never, {} as never);

    expect(result.isError).toBe(true);
    expect(
      (result.content[0] as { type: 'text'; text: string }).text
    ).toContain('404');
  });

  it('returns isError=true when the handler throws a generic Error', async () => {
    const tool = makeTool(vi.fn().mockRejectedValue(new Error('oops')));
    const handler = composeToolHandler(tool, OPTIONS);

    const result = await handler({} as never, {} as never);

    expect(result.isError).toBe(true);
    expect((result.content[0] as { type: 'text'; text: string }).text).toBe(
      'oops'
    );
  });

  it('truncates output that exceeds maxTokens', async () => {
    const bigData = { items: new Array(10_000).fill('word') };
    const tool = makeTool(vi.fn().mockResolvedValue(bigData));
    // Use a very small token limit to force truncation.
    const handler = composeToolHandler(tool, { maxTokens: 5, prefix: '' });

    const result = await handler({} as never, {} as never);

    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('...(output truncated due to token limit)');
  });

  it('does not truncate output that fits within maxTokens', async () => {
    const smallData = { id: '10001' };
    const tool = makeTool(vi.fn().mockResolvedValue(smallData));
    const handler = composeToolHandler(tool, OPTIONS);

    const result = await handler({} as never, {} as never);

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).not.toContain('truncated');
  });
});
