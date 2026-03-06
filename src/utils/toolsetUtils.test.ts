import { describe, it, expect } from 'vitest';
import {
  buildToolsetGroup,
  enableToolset,
  getToolset,
} from './toolsetUtils.js';
import type { ToolsetGroup } from '../types/toolsets.js';

function makeGroup(): ToolsetGroup {
  return {
    toolsets: [
      {
        name: 'issue',
        description: 'Issue tools',
        enabled: false,
        tools: [],
      },
      {
        name: 'issue_metadata',
        description: 'Issue metadata tools',
        enabled: false,
        tools: [],
      },
    ],
  };
}

describe('getToolset', () => {
  it('returns the toolset by name', () => {
    const group = makeGroup();
    const ts = getToolset(group, 'issue');
    expect(ts).toBeDefined();
    expect(ts?.name).toBe('issue');
  });

  it('returns undefined for unknown toolset names', () => {
    const group = makeGroup();
    expect(getToolset(group, 'unknown')).toBeUndefined();
  });
});

describe('enableToolset', () => {
  it('enables a disabled toolset', () => {
    const group = makeGroup();
    const msg = enableToolset(group, 'issue');
    expect(msg).toContain('enabled');
    expect(getToolset(group, 'issue')?.enabled).toBe(true);
  });

  it('returns a message when toolset is not found', () => {
    const group = makeGroup();
    const msg = enableToolset(group, 'unknown');
    expect(msg).toContain('not found');
  });

  it('returns a message when toolset is already enabled', () => {
    const group = makeGroup();
    enableToolset(group, 'issue');
    const msg = enableToolset(group, 'issue');
    expect(msg).toContain('already enabled');
  });
});

describe('buildToolsetGroup', () => {
  it('enables all toolsets when "all" is passed', () => {
    const group = makeGroup();
    const result = buildToolsetGroup(group, ['all']);
    expect(result.toolsets.every((ts) => ts.enabled)).toBe(true);
  });

  it('enables only specified toolsets', () => {
    const group = makeGroup();
    const result = buildToolsetGroup(group, ['issue']);
    const issue = result.toolsets.find((ts) => ts.name === 'issue');
    const meta = result.toolsets.find((ts) => ts.name === 'issue_metadata');
    expect(issue?.enabled).toBe(true);
    expect(meta?.enabled).toBe(false);
  });

  it('does not mutate the original group', () => {
    const group = makeGroup();
    buildToolsetGroup(group, ['all']);
    expect(group.toolsets.every((ts) => !ts.enabled)).toBe(true);
  });

  it('warns (but does not throw) for unknown toolset names', () => {
    const group = makeGroup();
    expect(() => buildToolsetGroup(group, ['unknown_toolset'])).not.toThrow();
  });
});
