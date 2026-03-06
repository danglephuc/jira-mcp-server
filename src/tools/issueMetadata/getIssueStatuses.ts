import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const getIssueStatusesSchema = z.object({
  projectIdOrKey: z
    .string()
    .optional()
    .describe(
      'Filter statuses by project ID or key. If omitted, returns all statuses.'
    ),
});

export function getIssueStatusesTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issue_statuses',
    description: t(
      'TOOL_GET_ISSUE_STATUSES_DESCRIPTION',
      'Returns a list of Jira issue statuses.'
    ),
    schema: getIssueStatusesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssueStatusesSchema>;
      if (input.projectIdOrKey) {
        // Project-scoped: returns array of { name (issueType), statuses[] }
        const raw = await client.get<unknown>(
          `${client.apiBasePath}/project/${encodeURIComponent(input.projectIdOrKey)}/statuses`
        );
        if (!Array.isArray(raw)) return [];
        return (raw as Record<string, unknown>[]).map((group) => ({
          name: group.name,
          statuses: Array.isArray(group.statuses)
            ? (group.statuses as Record<string, unknown>[]).map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                statusCategory: s.statusCategory
                  ? {
                      name: (s.statusCategory as Record<string, unknown>).name,
                      colorName: (s.statusCategory as Record<string, unknown>)
                        .colorName,
                    }
                  : null,
              }))
            : [],
        }));
      }
      // Global: returns array of status objects.
      const raw = await client.get<unknown>(`${client.apiBasePath}/status`);
      if (!Array.isArray(raw)) return [];
      return (raw as Record<string, unknown>[]).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        statusCategory: s.statusCategory
          ? {
              name: (s.statusCategory as Record<string, unknown>).name,
              colorName: (s.statusCategory as Record<string, unknown>)
                .colorName,
            }
          : null,
      }));
    },
  };
}
