import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const getFieldsSchema = z.object({});

export function getFieldsTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'get_fields',
    description: t(
      'TOOL_GET_FIELDS_DESCRIPTION',
      'Returns a list of all Jira fields (system and custom).'
    ),
    schema: getFieldsSchema as unknown as z.ZodObject<z.ZodRawShape>,
    handler: async () => {
      const raw = await client.get<unknown[]>(`${client.apiBasePath}/field`);
      return (raw as Record<string, unknown>[]).map((f) => ({
        id: f.id,
        name: f.name,
        custom: f.custom,
        schema: f.schema
          ? {
              type: (f.schema as Record<string, unknown>).type,
              system: (f.schema as Record<string, unknown>).system,
            }
          : undefined,
      }));
    },
  };
}
