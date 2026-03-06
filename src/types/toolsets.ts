import { ToolDefinition } from './tool.js';

export interface Toolset {
  name: string;
  description: string;
  enabled: boolean;
  tools: ToolDefinition[];
}

export interface ToolsetGroup {
  toolsets: Toolset[];
}
