import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTranslationHelper } from './createTranslationHelper.js';

vi.mock('cosmiconfig', () => {
  const search = vi.fn(() => ({
    config: {
      HELLO_KEY: 'hello from config',
    },
  }));
  return {
    cosmiconfigSync: vi.fn(() => ({ search })),
  };
});

describe('createTranslationHelper', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns fallback when no env or config is set', () => {
    const helper = createTranslationHelper({
      configName: 'non-existent-config',
      searchDir: '/tmp/non-existent',
    });

    const value = helper.t('SOME_KEY', 'fallback value');
    expect(value).toBe('fallback value');
  });

  it('prefers env var over config and fallback', () => {
    process.env.JIRA_MCP_HELLO_KEY = 'hello from env';

    const helper = createTranslationHelper();
    const value = helper.t('hello_key', 'fallback');

    expect(value).toBe('hello from env');
  });

  it('uses config value when env var is not set', () => {
    delete process.env.JIRA_MCP_HELLO_KEY;

    const helper = createTranslationHelper();
    const value = helper.t('hello_key', 'fallback');

    expect(value).toBe('hello from config');
  });

  it('caches values and exposes them via dump()', () => {
    const helper = createTranslationHelper();
    helper.t('hello_key', 'fallback');

    const dumped = helper.dump();
    expect(dumped.HELLO_KEY).toBeDefined();
  });
});
