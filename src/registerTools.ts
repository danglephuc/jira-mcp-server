import { composeToolHandler } from './handlers/builders/composeToolHandler.js';
import { MCPOptions } from './types/mcp.js';
import { ToolsetGroup } from './types/toolsets.js';
import { JiraMCPServer } from './utils/wrapServerWithToolRegistry.js';

export function registerTools(
  server: JiraMCPServer,
  toolsetGroup: ToolsetGroup,
  options: MCPOptions
) {
  const { prefix, maxTokens } = options;

  for (const toolset of toolsetGroup.toolsets) {
    if (!toolset.enabled) continue;

    for (const tool of toolset.tools) {
      const toolNameWithPrefix = `${prefix}${tool.name}`;
      const handler = composeToolHandler(tool as never, { maxTokens, prefix });

      server.registerOnce(
        toolNameWithPrefix,
        tool.description,
        tool.schema.shape,
        handler
      );
    }
  }
}
