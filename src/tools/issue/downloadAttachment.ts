import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const downloadAttachmentSchema = z.object({
  attachmentId: z
    .string()
    .describe('The ID of the attachment to download (e.g. "10010")'),
  outputPath: z
    .string()
    .optional()
    .describe(
      'Absolute file path to save the attachment directly to disk. When provided, the file is streamed to disk instead of being returned as base64.'
    ),
});

export function downloadAttachmentTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'download_attachment',
    description: t(
      'TOOL_DOWNLOAD_ATTACHMENT_DESCRIPTION',
      'Downloads a specific attachment file from a Jira issue. Use get_attachments first to obtain the attachment ID. By default returns the file as base64-encoded content. If outputPath is provided, streams the file directly to disk (recommended for large files) and returns a success confirmation instead.'
    ),
    schema: downloadAttachmentSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof downloadAttachmentSchema>;

      // Fetch attachment metadata to get the content URL and filename.
      const metadata = await client.get<{
        id: string;
        filename: string;
        mimeType: string;
        size: number;
        content: string;
      }>(`${client.apiBasePath}/attachment/${input.attachmentId}`);

      // If an output path is provided, stream directly to disk.
      if (input.outputPath) {
        await client.downloadAttachmentToFile(
          metadata.content,
          input.outputPath
        );
        return {
          success: true,
          savedTo: input.outputPath,
        };
      }

      // Download the binary content.
      const { base64, mimeType } = await client.getAttachmentBuffer(
        metadata.content
      );

      return {
        id: metadata.id,
        filename: metadata.filename,
        mimeType,
        size: metadata.size,
        base64Content: base64,
      };
    },
  };
}
