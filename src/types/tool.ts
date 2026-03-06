import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  // Input is validated by the MCP server against the schema before calling the handler.
  // We keep the type loose here to avoid over-constraining tool implementations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any) => Promise<unknown>;
}
