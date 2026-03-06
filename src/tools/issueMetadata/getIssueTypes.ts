import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const getIssueTypesSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(
      'Filter issue types by project ID. If omitted, returns all issue types.'
    ),
});

export function getIssueTypesTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue_types',
    description: t(
      'TOOL_GET_ISSUE_TYPES_DESCRIPTION',
      'Returns a list of Jira issue types.'
    ),
    schema: getIssueTypesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssueTypesSchema>;
      if (input.projectId) {
        return client.get(
          `/rest/api/3/issuetype/project?projectId=${encodeURIComponent(input.projectId)}`
        );
      }
      return client.get('/rest/api/3/issuetype');
    },
  };
}
