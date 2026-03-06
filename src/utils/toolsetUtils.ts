import { ToolsetGroup, Toolset } from '../types/toolsets.js';

export function getToolset(
  group: ToolsetGroup,
  name: string
): Toolset | undefined {
  return group.toolsets.find((t) => t.name === name);
}

export function enableToolset(group: ToolsetGroup, name: string): string {
  const ts = getToolset(group, name);
  if (!ts) return `Toolset ${name} not found`;
  if (ts.enabled) return `Toolset ${name} is already enabled`;
  ts.enabled = true;
  return `Toolset ${name} enabled`;
}

export function buildToolsetGroup(
  baseGroup: ToolsetGroup,
  enabledToolsets: string[]
): ToolsetGroup {
  const knownNames = baseGroup.toolsets.map((ts) => ts.name);
  const unknown = enabledToolsets.filter(
    (name) => name !== 'all' && !knownNames.includes(name)
  );

  if (unknown.length > 0) {
    console.warn(`Unknown toolsets: ${unknown.join(', ')}`);
  }

  const allEnabled = enabledToolsets.includes('all');

  return {
    toolsets: baseGroup.toolsets.map((ts) => ({
      ...ts,
      enabled: allEnabled || enabledToolsets.includes(ts.name),
    })),
  };
}
