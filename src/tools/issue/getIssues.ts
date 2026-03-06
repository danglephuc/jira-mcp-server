import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';
import { mapSearchResult } from './mapIssue.js';

const getIssuesSchema = z.object({
  jql: z
    .string()
    .optional()
    .describe(
      'JQL query string to filter issues (e.g. "project = MYPROJ AND status = Open")'
    ),
  fields: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of fields to include in the response (default: all)'
    ),
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
  expand: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of entities to expand (e.g. "renderedFields,names")'
    ),
});

export function getIssuesTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_issues',
    description: t(
      'TOOL_GET_ISSUES_DESCRIPTION',
      'Returns a list of Jira issues using JQL with optional filters.'
    ),
    schema: getIssuesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof getIssuesSchema>;
      const params: Record<string, string | number | boolean> = {};

      if (input.jql !== undefined) params.jql = input.jql;
      if (input.fields !== undefined) params.fields = input.fields;
      if (input.startAt !== undefined) params.startAt = input.startAt;
      if (input.maxResults !== undefined) params.maxResults = input.maxResults;
      if (input.expand !== undefined) params.expand = input.expand;

      // Jira Cloud REST API v3 removed GET /search (410 Gone) in favour of
      // GET /search/jql. Jira Server/DC v2 still uses the original /search path.
      // Jira Cloud REST API v3 removed GET /search (410 Gone) in favour of
      // GET /search/jql. Jira Server/DC v2 still uses the original /search path.
      const searchPath =
        client.apiVersion === '3'
          ? `${client.apiBasePath}/search/jql`
          : `${client.apiBasePath}/search`;
      const raw = await client.get(searchPath, params);
      return mapSearchResult(raw, client.apiVersion);
    },
  };
}
