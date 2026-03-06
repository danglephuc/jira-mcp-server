import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFieldsTool } from './getFields.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockFields = [
  {
    id: 'summary',
    name: 'Summary',
    custom: false,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['summary'],
    schema: { type: 'string', system: 'summary' },
  },
  {
    id: 'customfield_10001',
    name: 'Story Points',
    custom: true,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['cf[10001]', 'story_points'],
    schema: {
      type: 'number',
      custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
    },
  },
];

describe('getFieldsTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockFields),
  } as unknown as JiraClient;

  const tool = getFieldsTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockFields);
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_fields');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the list of fields from the client', async () => {
    const result = await tool.handler({});

    expect(result).toEqual(mockFields);
  });

  it('calls client.get with the fields endpoint', async () => {
    await tool.handler({});

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/field');
  });
});
