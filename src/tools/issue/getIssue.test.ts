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
    reporter: { displayName: 'Bob' },
    creator: null,
    created: '2025-01-01T00:00:00.000+0000',
    updated: '2025-01-02T00:00:00.000+0000',
    labels: [],
    components: [],
    fixVersions: [],
    subtasks: [],
    comment: {
      comments: [
        {
          id: '20001',
          author: {
            displayName: 'Alice',
            emailAddress: 'alice@example.com',
          },
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Sample issue comment' }],
              },
            ],
          },
          created: '2025-01-01T12:00:00.000+0000',
          updated: '2025-01-01T12:00:00.000+0000',
        },
      ],
      maxResults: 1,
      total: 1,
      startAt: 0,
    },
  },
};

describe('getIssueTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssue),
    apiBasePath: '/rest/api/3',
    apiVersion: '3',
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

  it('returns a mapped issue (not raw Jira JSON)', async () => {
    const result = (await tool.handler({ issueKey: 'PROJ-1' })) as Record<
      string,
      unknown
    >;
    const comments = result.comment as Array<{ id: string }>;

    expect(result.key).toBe('PROJ-1');
    expect(result.summary).toBe('Sample issue subject');
    expect(result.status).toBe('Open');
    expect(result.description).toBe('Sample issue description');
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe('20001');
    // Noise fields must not be present.
    expect('self' in result).toBe(false);
    expect('expand' in result).toBe(false);
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
