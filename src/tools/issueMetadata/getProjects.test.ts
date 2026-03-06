import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProjectsTool } from './getProjects.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockProjects = {
  self: 'https://example.atlassian.net/rest/api/3/project/search',
  maxResults: 50,
  startAt: 0,
  total: 2,
  isLast: true,
  values: [
    {
      id: '10000',
      key: 'PROJ',
      name: 'Project Alpha',
      projectTypeKey: 'software',
    },
    {
      id: '10001',
      key: 'BETA',
      name: 'Project Beta',
      projectTypeKey: 'software',
    },
  ],
};

describe('getProjectsTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockProjects),
    apiBasePath: '/rest/api/2',
  } as unknown as JiraClient;

  const tool = getProjectsTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProjects
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_projects');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of projects from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockProjects);
  });

  it('calls client.get with no params when called with empty input', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/api/2/project/search',
      {}
    );
  });

  it('maps query to the query param', async () => {
    await tool.handler({ query: 'alpha' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/project/search', {
      query: 'alpha',
    });
  });

  it('maps pagination params', async () => {
    await tool.handler({ startAt: 50, maxResults: 25 });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/project/search', {
      startAt: 50,
      maxResults: 25,
    });
  });

  it('maps orderBy param', async () => {
    await tool.handler({ orderBy: 'name' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/project/search', {
      orderBy: 'name',
    });
  });
});
