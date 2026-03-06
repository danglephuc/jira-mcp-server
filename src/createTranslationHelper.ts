import { cosmiconfigSync } from 'cosmiconfig';
import os from 'os';

export interface TranslationHelper {
  t: (key: string, fallback: string) => string;
  dump: () => Record<string, string>;
}

export function createTranslationHelper(options?: {
  configName?: string;
  searchDir?: string;
}): TranslationHelper {
  const usedKeys: Record<string, string> = {};

  const configName = options?.configName ?? 'jira-mcp-server';
  const explorer = cosmiconfigSync(configName);
  const searchPath = options?.searchDir ?? os.homedir();

  const configResult = explorer.search(searchPath);
  const config = (configResult?.config as Record<string, string>) || {};

  function toEnvKey(key: string): string {
    return `JIRA_MCP_${key}`;
  }

  function t(key: string, fallback: string): string {
    const upperKey = key.toUpperCase();

    if (usedKeys[upperKey]) {
      return usedKeys[upperKey];
    }

    const value =
      process.env[toEnvKey(upperKey)] || config[upperKey] || fallback;

    usedKeys[upperKey] = value;
    return value;
  }

  function dump(): Record<string, string> {
    return { ...usedKeys };
  }

  return { t, dump };
}
