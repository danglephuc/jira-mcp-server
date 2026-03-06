import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrioritiesTool } from './getPriorities.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockPriorities = [
  {
    id: '1',
    name: 'Highest',
    iconUrl: 'https://example.atlassian.net/img/p1.png',
  },
  {
    id: '2',
    name: 'High',
    iconUrl: 'https://example.atlassian.net/img/p2.png',
  },
  {
    id: '3',
    name: 'Medium',
    iconUrl: 'https://example.atlassian.net/img/p3.png',
  },
  { id: '4', name: 'Low', iconUrl: 'https://example.atlassian.net/img/p4.png' },
  {
    id: '5',
    name: 'Lowest',
    iconUrl: 'https://example.atlassian.net/img/p5.png',
  },
];

describe('getPrioritiesTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockPriorities),
  } as unknown as JiraClient;

  const tool = getPrioritiesTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPriorities
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_priorities');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of priorities from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockPriorities);
  });

  it('calls client.get with the priorities endpoint', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/priority');
  });
});
