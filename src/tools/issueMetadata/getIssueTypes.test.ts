import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueTypesTool } from './getIssueTypes.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockIssueTypes = [
  {
    id: '1',
    name: 'Bug',
    iconUrl: 'https://example.atlassian.net/img/bug.png',
  },
  {
    id: '2',
    name: 'Story',
    iconUrl: 'https://example.atlassian.net/img/story.png',
  },
  {
    id: '3',
    name: 'Task',
    iconUrl: 'https://example.atlassian.net/img/task.png',
  },
];

describe('getIssueTypesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssueTypes),
    apiBasePath: '/rest/api/2',
  } as unknown as JiraClient;

  const tool = getIssueTypesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueTypes
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue_types');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns mapped issue types (noise fields stripped)', async () => {
    const result = (await tool.handler({})) as Record<string, unknown>[];

    expect(result).toEqual([
      {
        id: '1',
        name: 'Bug',
        description: undefined,
        subtask: undefined,
        hierarchyLevel: undefined,
      },
      {
        id: '2',
        name: 'Story',
        description: undefined,
        subtask: undefined,
        hierarchyLevel: undefined,
      },
      {
        id: '3',
        name: 'Task',
        description: undefined,
        subtask: undefined,
        hierarchyLevel: undefined,
      },
    ]);
  });

  it('calls the global issue types endpoint when no projectId is given', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/issuetype');
  });

  it('calls the project issue types endpoint when projectId is given', async () => {
    await tool.handler({ projectId: '10000' });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/api/2/issuetype/project?projectId=10000'
    );
  });
});
