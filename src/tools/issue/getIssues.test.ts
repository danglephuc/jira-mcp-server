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
        status: { name: 'Open', statusCategory: { name: 'To Do' } },
        assignee: { displayName: 'Alice' },
        priority: { name: 'High' },
        issuetype: { name: 'Bug' },
        reporter: null,
        creator: null,
        created: '2025-01-01T00:00:00.000+0000',
        updated: '2025-01-01T00:00:00.000+0000',
        labels: [],
        components: [],
        fixVersions: [],
        subtasks: [],
      },
    },
    {
      id: '10002',
      key: 'PROJ-2',
      fields: {
        summary: 'Issue Two',
        status: {
          name: 'In Progress',
          statusCategory: { name: 'In Progress' },
        },
        assignee: { displayName: 'Bob' },
        priority: { name: 'Normal' },
        issuetype: { name: 'Task' },
        reporter: null,
        creator: null,
        created: '2025-01-02T00:00:00.000+0000',
        updated: '2025-01-03T00:00:00.000+0000',
        labels: [],
        components: [],
        fixVersions: [],
        subtasks: [],
      },
    },
  ],
};

describe('getIssuesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssueList),
    apiBasePath: '/rest/api/2',
    apiVersion: '2',
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

  it('returns a mapped search result (not raw Jira JSON)', async () => {
    const result = (await tool.handler({})) as Record<string, unknown>;

    expect(result.startAt).toBe(0);
    expect(result.maxResults).toBe(50);
    expect(result.total).toBe(2);
    expect(Array.isArray(result.issues)).toBe(true);
    const issues = result.issues as Record<string, unknown>[];
    expect(issues[0].key).toBe('PROJ-1');
    expect(issues[0].status).toBe('Open');
    // Noise fields must not be present at the wrapper level.
    expect('expand' in result).toBe(false);
  });

  it('calls client.get with /search for API v2 (Server/DC)', async () => {
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

describe('getIssuesTool (API v3 — Jira Cloud)', () => {
  const mockClientV3 = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssueList),
    apiBasePath: '/rest/api/3',
    apiVersion: '3',
  } as unknown as JiraClient;

  const toolV3 = getIssuesTool(mockClientV3, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClientV3.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueList
    );
  });

  it('calls client.get with /search/jql for API v3 (Cloud)', async () => {
    await toolV3.handler({});

    expect(mockClientV3.get).toHaveBeenCalledWith('/rest/api/3/search/jql', {});
  });

  it('passes jql to /search/jql for API v3', async () => {
    await toolV3.handler({ jql: 'project = SFITLOCAL' });

    expect(mockClientV3.get).toHaveBeenCalledWith('/rest/api/3/search/jql', {
      jql: 'project = SFITLOCAL',
    });
  });

  it('combines multiple filters with /search/jql for API v3', async () => {
    await toolV3.handler({
      jql: 'project = CLOUD',
      fields: 'summary,status',
      maxResults: 10,
      expand: 'names',
    });

    expect(mockClientV3.get).toHaveBeenCalledWith('/rest/api/3/search/jql', {
      jql: 'project = CLOUD',
      fields: 'summary,status',
      maxResults: 10,
      expand: 'names',
    });
  });
});
