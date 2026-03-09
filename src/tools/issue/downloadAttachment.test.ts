import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAttachmentTool } from './downloadAttachment.js';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import type { JiraClient } from '../../jira/client.js';

const mockMetadata = {
  id: '10010',
  filename: 'screenshot.png',
  mimeType: 'image/png',
  size: 102400,
  content: 'https://jira.example.com/secure/attachment/10010/screenshot.png',
};

const mockBufferResult = {
  base64: 'iVBORw0KGgo=',
  mimeType: 'image/png',
};

describe('downloadAttachmentTool', () => {
  const mockClient = {
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockMetadata),
    getAttachmentBuffer: vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue(mockBufferResult),
    downloadAttachmentToFile: vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    apiBasePath: '/rest/api/2',
  } as unknown as JiraClient;

  const tool = downloadAttachmentTool(mockClient, createTranslationHelper());

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockMetadata
    );
    (
      mockClient.getAttachmentBuffer as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockBufferResult);
    (
      mockClient.downloadAttachmentToFile as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  });

  it('has the correct tool name and description', () => {
    expect(tool.name).toBe('download_attachment');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('fetches attachment metadata then downloads content', async () => {
    const result = await tool.handler({ attachmentId: '10010' });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/attachment/10010');
    expect(mockClient.getAttachmentBuffer).toHaveBeenCalledWith(
      mockMetadata.content
    );
    expect(result).toEqual({
      id: '10010',
      filename: 'screenshot.png',
      mimeType: 'image/png',
      size: 102400,
      base64Content: 'iVBORw0KGgo=',
    });
  });

  it('returns the mimeType from the downloaded content', async () => {
    (
      mockClient.getAttachmentBuffer as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      base64: 'JVBER',
      mimeType: 'application/pdf',
    });
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockMetadata,
      filename: 'report.pdf',
      mimeType: 'application/pdf',
    });

    const result = (await tool.handler({ attachmentId: '10011' })) as {
      mimeType: string;
      base64Content: string;
    };

    expect(result.mimeType).toBe('application/pdf');
    expect(result.base64Content).toBe('JVBER');
  });

  it('passes the content URL from metadata to getAttachmentBuffer', async () => {
    const customMetadata = {
      ...mockMetadata,
      content: 'https://custom.jira.com/attachments/12345',
    };
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      customMetadata
    );

    await tool.handler({ attachmentId: '12345' });

    expect(mockClient.getAttachmentBuffer).toHaveBeenCalledWith(
      'https://custom.jira.com/attachments/12345'
    );
  });

  it('streams to disk and returns success when outputPath is provided', async () => {
    const result = await tool.handler({
      attachmentId: '10010',
      outputPath: '/tmp/downloads/screenshot.png',
    });

    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/attachment/10010');
    expect(mockClient.downloadAttachmentToFile).toHaveBeenCalledWith(
      mockMetadata.content,
      '/tmp/downloads/screenshot.png'
    );
    expect(mockClient.getAttachmentBuffer).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      savedTo: '/tmp/downloads/screenshot.png',
    });
  });

  it('falls back to base64 when outputPath is not provided', async () => {
    const result = await tool.handler({ attachmentId: '10010' });

    expect(mockClient.downloadAttachmentToFile).not.toHaveBeenCalled();
    expect(mockClient.getAttachmentBuffer).toHaveBeenCalled();
    expect(result).toEqual({
      id: '10010',
      filename: 'screenshot.png',
      mimeType: 'image/png',
      size: 102400,
      base64Content: 'iVBORw0KGgo=',
    });
  });
});
