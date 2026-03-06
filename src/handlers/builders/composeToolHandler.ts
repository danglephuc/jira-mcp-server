import { wrapWithErrorHandling } from '../transformers/wrapWithErrorHandling.js';
import { wrapWithTokenLimit } from '../transformers/wrapWithTokenLimit.js';
import { wrapWithToolResult } from '../transformers/wrapWithToolResult.js';
import { MCPOptions } from '../../types/mcp.js';
import { ToolDefinition } from '../../types/tool.js';

export function composeToolHandler(tool: ToolDefinition, options: MCPOptions) {
  const { maxTokens } = options;

  const handlerWithErrors = wrapWithErrorHandling(tool.handler);
  const handlerWithLimit = wrapWithTokenLimit(handlerWithErrors, maxTokens);

  return wrapWithToolResult(handlerWithLimit);
}
