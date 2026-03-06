import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueTool } from './getIssue.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockIssue = {
  id: '10001',
  key: 'PROJ-1',
  fields: {
    summary: 'Sample issue subject',
    description: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Sample issue description' }],
        },
      ],
    },
    status: { name: 'Open', statusCategory: { name: 'To Do' } },
    assignee: { displayName: 'Alice', emailAddress: 'alice@example.com' },
    priority: { name: 'High' },
    issuetype: { name: 'Bug' },
    created: '2025-01-01T00:00:00.000+0000',
    updated: '2025-01-02T00:00:00.000+0000',
  },
};

describe('getIssueTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssue),
  } as unknown as JiraClient;

  const tool = getIssueTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockIssue);
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the issue data from the client', async () => {
    const result = await tool.handler({ issueKey: 'PROJ-1' });

    expect(result).toEqual(mockIssue);
  });

  it('calls client.get with the correct URL for a given issue key', async () => {
    await tool.handler({ issueKey: 'PROJ-1' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/issue/PROJ-1', {});
  });

  it('calls client.get with a numeric issue ID', async () => {
    await tool.handler({ issueKey: '10001' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/issue/10001', {});
  });

  it('passes the fields param when provided', async () => {
    await tool.handler({ issueKey: 'PROJ-1', fields: 'summary,status' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/issue/PROJ-1', {
      fields: 'summary,status',
    });
  });

  it('passes the expand param when provided', async () => {
    await tool.handler({
      issueKey: 'PROJ-1',
      expand: 'renderedFields,changelog',
    });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/issue/PROJ-1', {
      expand: 'renderedFields,changelog',
    });
  });

  it('omits optional params when not provided', async () => {
    await tool.handler({ issueKey: 'PROJ-1' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/issue/PROJ-1', {});
  });
});
