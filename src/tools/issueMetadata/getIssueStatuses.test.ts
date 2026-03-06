import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIssueStatusesTool } from './getIssueStatuses.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockStatuses = [
  {
    id: '1',
    name: 'Open',
    statusCategory: { id: 2, name: 'To Do', colorName: 'blue-gray' },
  },
  {
    id: '3',
    name: 'In Progress',
    statusCategory: { id: 4, name: 'In Progress', colorName: 'yellow' },
  },
  {
    id: '6',
    name: 'Closed',
    statusCategory: { id: 3, name: 'Done', colorName: 'green' },
  },
];

describe('getIssueStatusesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockStatuses),
  } as unknown as JiraClient;

  const tool = getIssueStatusesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockStatuses
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_issue_statuses');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of statuses from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockStatuses);
  });

  it('calls the global statuses endpoint when no projectIdOrKey is given', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/status');
  });

  it('calls the project statuses endpoint when projectIdOrKey is given', async () => {
    await tool.handler({ projectIdOrKey: 'PROJ' });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/api/3/project/PROJ/statuses'
    );
  });
});
