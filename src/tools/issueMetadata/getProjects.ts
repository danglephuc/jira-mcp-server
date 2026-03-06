import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const getProjectsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Filter projects by name or key (case-insensitive)'),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Offset for pagination (default: 0)'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results to return (1-100, default: 50)'),
  orderBy: z
    .enum(['category', 'issueCount', 'key', 'lastIssueUpdatedTime', 'name'])
    .optional()
    .describe('Order results by field (default: key)'),
  expand: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of properties to expand (e.g. "description,lead,issueTypes")'
    ),
});

export function getProjectsTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_projects',
    description: t(
      'TOOL_GET_PROJECTS_DESCRIPTION',
      'Returns a list of Jira projects visible to the authenticated user.'
    ),
    schema: getProjectsSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getProjectsSchema>;
      const params: Record<string, string | number | boolean> = {};

      if (input.query !== undefined) params.query = input.query;
      if (input.startAt !== undefined) params.startAt = input.startAt;
      if (input.maxResults !== undefined) params.maxResults = input.maxResults;
      if (input.orderBy !== undefined) params.orderBy = input.orderBy;
      if (input.expand !== undefined) params.expand = input.expand;

      const raw = await client.get<Record<string, unknown>>(
        `${client.apiBasePath}/project/search`,
        params
      );
      const values = Array.isArray(raw.values) ? raw.values : [];
      return {
        startAt: raw.startAt ?? 0,
        maxResults: raw.maxResults ?? 0,
        total: raw.total ?? 0,
        isLast: raw.isLast ?? true,
        projects: values.map((p: Record<string, unknown>) => {
          const lead = p.lead as Record<string, unknown> | undefined;
          return {
            id: p.id,
            key: p.key,
            name: p.name,
            projectTypeKey: p.projectTypeKey,
            style: p.style,
            isPrivate: p.isPrivate,
            ...(lead ? { lead: { displayName: lead.displayName } } : {}),
          };
        }),
      };
    },
  };
}
