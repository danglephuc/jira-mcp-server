import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssuesTool } from './getIssues.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockIssueList = {
  expand: 'schema,names',
  startAt: 0,
  maxResults: 50,
  total: 2,
  issues: [
    {
      id: '10001',
      key: 'PROJ-1',
      fields: {
        summary: 'Issue One',
        status: { name: 'Open' },
        assignee: { displayName: 'Alice' },
        priority: { name: 'High' },
        created: '2025-01-01T00:00:00.000+0000',
        updated: '2025-01-01T00:00:00.000+0000',
      },
    },
    {
      id: '10002',
      key: 'PROJ-2',
      fields: {
        summary: 'Issue Two',
        status: { name: 'In Progress' },
        assignee: { displayName: 'Bob' },
        priority: { name: 'Normal' },
        created: '2025-01-02T00:00:00.000+0000',
        updated: '2025-01-03T00:00:00.000+0000',
      },
    },
  ],
};

describe('getIssuesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssueList),
    apiBasePath: '/rest/api/2',
  } as unknown as JiraClient;

  const tool = getIssuesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueList
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issues');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of issues from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockIssueList);
  });

  it('calls client.get with no params when called with empty input', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {});
  });

  it('maps jql to the jql query param', async () => {
    await tool.handler({ jql: 'project = PROJ AND status = Open' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {
      jql: 'project = PROJ AND status = Open',
    });
  });

  it('maps fields to the fields query param', async () => {
    await tool.handler({ fields: 'summary,status,assignee' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {
      fields: 'summary,status,assignee',
    });
  });

  it('maps startAt to the startAt query param', async () => {
    await tool.handler({ startAt: 50 });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {
      startAt: 50,
    });
  });

  it('maps maxResults to the maxResults query param', async () => {
    await tool.handler({ maxResults: 25 });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {
      maxResults: 25,
    });
  });

  it('maps expand to the expand query param', async () => {
    await tool.handler({ expand: 'renderedFields,names' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {
      expand: 'renderedFields,names',
    });
  });

  it('combines multiple filters correctly', async () => {
    await tool.handler({
      jql: 'project = PROJ',
      fields: 'summary,status',
      startAt: 0,
      maxResults: 10,
      expand: 'names',
    });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/search', {
      jql: 'project = PROJ',
      fields: 'summary,status',
      startAt: 0,
      maxResults: 10,
      expand: 'names',
    });
  });
});
