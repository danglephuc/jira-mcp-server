import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';
import { mapIssue } from './mapIssue.js';

const getIssueSchema = z.object({
  issueKey: z.string().describe('Issue key or ID (e.g. "PROJ-123" or "10001")'),
  fields: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of fields to include in the response (default: all)'
    ),
  expand: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of entities to expand (e.g. "renderedFields,names,changelog")'
    ),
});

export function getIssueTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue',
    description: t(
      'TOOL_GET_ISSUE_DESCRIPTION',
      'Returns detailed information about a specific Jira issue.'
    ),
    schema: getIssueSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssueSchema>;
      const params: Record<string, string> = {};
      if (input.fields) params.fields = input.fields;
      if (input.expand) params.expand = input.expand;

      const raw = await client.get(
        `${client.apiBasePath}/issue/${input.issueKey}`,
        params
      );
      return mapIssue(raw, client.apiVersion);
    },
  };
}
