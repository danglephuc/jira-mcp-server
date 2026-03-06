import { describe, it, expect, vi } from 'vitest';
import { wrapServerWithToolRegistry } from './wrapServerWithToolRegistry.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function makeMockServer(): McpServer {
  return {
    tool: vi.fn(),
  } as unknown as McpServer;
}

describe('wrapServerWithToolRegistry', () => {
  it('adds a registerOnce method to the server', () => {
    const server = wrapServerWithToolRegistry(makeMockServer());
    expect(typeof server.registerOnce).toBe('function');
  });

  it('registers a tool via the underlying server.tool method', () => {
    const mockServer = makeMockServer();
    const wrapped = wrapServerWithToolRegistry(mockServer);

    const handler = vi.fn();
    wrapped.registerOnce('test_tool', 'A test tool', {}, handler);

    expect((mockServer as any).tool).toHaveBeenCalledWith(
      'test_tool',
      'A test tool',
      {},
      handler
    );
  });

  it('skips duplicate registrations', () => {
    const mockServer = makeMockServer();
    const wrapped = wrapServerWithToolRegistry(mockServer);

    const handler = vi.fn();
    wrapped.registerOnce('test_tool', 'A test tool', {}, handler);
    wrapped.registerOnce('test_tool', 'A test tool (dup)', {}, handler);

    expect((mockServer as any).tool).toHaveBeenCalledTimes(1);
  });

  it('registers distinct tools independently', () => {
    const mockServer = makeMockServer();
    const wrapped = wrapServerWithToolRegistry(mockServer);

    wrapped.registerOnce('tool_a', 'Tool A', {}, vi.fn());
    wrapped.registerOnce('tool_b', 'Tool B', {}, vi.fn());

    expect((mockServer as any).tool).toHaveBeenCalledTimes(2);
  });
});
