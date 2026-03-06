import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAttachmentsTool } from './getAttachments.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockAttachments = [
  {
    id: '10010',
    filename: 'screenshot.png',
    mimeType: 'image/png',
    size: 102400,
    created: '2025-03-01T10:00:00.000+0000',
    author: { displayName: 'Alice', emailAddress: 'alice@example.com' },
    content: 'https://jira.example.com/secure/attachment/10010/screenshot.png',
  },
  {
    id: '10011',
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    size: 204800,
    created: '2025-03-02T14:30:00.000+0000',
    author: { displayName: 'Bob', emailAddress: 'bob@example.com' },
    content: 'https://jira.example.com/secure/attachment/10011/report.pdf',
  },
];

const mockIssueResponse = {
  fields: {
    attachment: mockAttachments,
  },
};

describe('getAttachmentsTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockIssueResponse),
    apiBasePath: '/rest/api/2',
  } as unknown as JiraClient;

  const tool = getAttachmentsTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockIssueResponse
    );
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('get_attachments');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns the attachments from the issue', async () => {
    const result = await tool.handler({ issueKey: 'PROJ-1' });

    expect(result).toEqual(mockAttachments);
  });

  it('calls client.get with the correct URL and fields param', async () => {
    await tool.handler({ issueKey: 'PROJ-1' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/issue/PROJ-1', {
      fields: 'attachment',
    });
  });

  it('calls client.get with a numeric issue ID', async () => {
    await tool.handler({ issueKey: '10001' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/issue/10001', {
      fields: 'attachment',
    });
  });

  it('returns an empty array when the issue has no attachments', async () => {
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      fields: { attachment: [] },
    });

    const result = await tool.handler({ issueKey: 'PROJ-2' });

    expect(result).toEqual([]);
  });

  it('returns an empty array when attachment field is undefined', async () => {
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      fields: {},
    });

    const result = await tool.handler({ issueKey: 'PROJ-3' });

    expect(result).toEqual([]);
  });
});
