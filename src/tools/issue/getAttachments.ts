import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const getAttachmentsSchema = z.object({
  issueKey: z.string().describe('Issue key or ID (e.g. "PROJ-123" or "10001")'),
});

export function getAttachmentsTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_attachments',
    description: t(
      'TOOL_GET_ATTACHMENTS_DESCRIPTION',
      'Returns a list of attachments (images, files, etc.) for a specific Jira issue.'
    ),
    schema: getAttachmentsSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getAttachmentsSchema>;

      // Fetch the issue with only the attachment field to minimise payload size.
      const issue = await client.get<{
        fields: { attachment?: unknown[] };
      }>(`${client.apiBasePath}/issue/${input.issueKey}`, {
        fields: 'attachment',
      });

      const attachments = (issue.fields.attachment ?? []) as Record<
        string,
        unknown
      >[];
      return attachments.map((att) => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        created: att.created,
        author: att.author
          ? { displayName: (att.author as Record<string, unknown>).displayName }
          : null,
      }));
    },
  };
}
