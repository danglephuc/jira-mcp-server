import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const getPrioritiesSchema = z.object({});

export function getPrioritiesTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_priorities',
    description: t(
      'TOOL_GET_PRIORITIES_DESCRIPTION',
      'Returns the list of Jira issue priorities.'
    ),
    schema: getPrioritiesSchema as unknown as z.ZodObject<z.ZodRawShape>,
    handler: async () => {
      const raw = await client.get<unknown[]>(`${client.apiBasePath}/priority`);
      return (raw as Record<string, unknown>[]).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      }));
    },
  };
}
