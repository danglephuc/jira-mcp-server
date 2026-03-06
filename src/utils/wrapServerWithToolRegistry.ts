import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';

export interface JiraMCPServer extends McpServer {
  __registeredToolNames?: Set<string>;

  registerOnce: (
    name: string,
    description: string,
    schema: ZodRawShapeCompat,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any
  ) => void;
}

export function wrapServerWithToolRegistry(server: McpServer): JiraMCPServer {
  const s = server as JiraMCPServer;

  if (!s.__registeredToolNames) {
    s.__registeredToolNames = new Set<string>();
  }

  s.registerOnce = (
    name: string,
    description: string,
    schema: ZodRawShapeCompat,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any
  ) => {
    if (s.__registeredToolNames!.has(name)) {
      console.error(`Skipping duplicate tool registration: ${name}`);
      return;
    }
    s.__registeredToolNames!.add(name);
    (
      s as McpServer & {
        tool: (
          name: string,
          description: string,
          schema: ZodRawShapeCompat,
          handler: unknown
        ) => void;
      }
    ).tool(name, description, schema, handler);
  };

  return s;
}
