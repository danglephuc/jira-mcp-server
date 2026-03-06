#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import env from 'env-var';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createTranslationHelper } from './createTranslationHelper.js';
import { JiraClient } from './jira/client.js';
import { allTools } from './tools/tools.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import { registerTools } from './registerTools.js';
import { logger } from './utils/logger.js';
import packageJson from '../package.json' with { type: 'json' };

dotenv.config();

const { version } = packageJson as { version: string };

const argv = yargs(hideBin(process.argv))
  .option('max-tokens', {
    type: 'number',
    describe: 'Maximum number of tokens allowed in the response',
    default: env.get('MAX_TOKENS').default('50000').asIntPositive(),
  })
  .option('prefix', {
    type: 'string',
    describe: 'Optional string prefix to prepend to all tool names',
    default: env.get('PREFIX').default('').asString(),
  })
  .option('enable-toolsets', {
    type: 'array',
    describe: `Specify which toolsets to enable. Defaults to 'all'.
Available toolsets:
 - issue: Tools for querying Jira issues
 - issue_metadata: Tools for querying Jira issue metadata`,
    default: env.get('ENABLE_TOOLSETS').default('all').asArray(','),
  })
  .option('export-translations', {
    type: 'boolean',
    describe: 'Export translations and exit',
    default: false,
  })
  .parseSync();

const maxTokens = argv.maxTokens as number;
const prefix = argv.prefix as string;
const enabledToolsets = argv.enableToolsets as string[];

const server = wrapServerWithToolRegistry(
  new McpServer({
    name: 'jira',
    title: 'jira',
    version,
  })
);

const client = new JiraClient();
const transHelper = createTranslationHelper();

const baseToolsetGroup = allTools(client, transHelper);
const toolsetGroup = buildToolsetGroup(baseToolsetGroup, enabledToolsets);

registerTools(server, toolsetGroup, { maxTokens, prefix });

if (argv.exportTranslations) {
  const data = transHelper.dump();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Jira MCP Server running on stdio');
}

main().catch((error) => {
  logger.error({ err: error }, 'Fatal error in main()');
  process.exit(1);
});
