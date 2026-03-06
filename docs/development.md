# Development

This document explains how to run, build, test, and extend the Jira MCP Server.

---

## Setup

```sh
git clone https://github.com/danglephuc/jira-mcp-server.git
cd jira-mcp-server
npm install
cp .env.example .env
# Edit .env with your Jira credentials
```

---

## Running

```sh
npm run dev          # Run with tsx (hot reload, reads .env)
npm run inspect      # Launch MCP Inspector UI at http://localhost:6274
```

---

## Building

```sh
npm run build        # Compile TypeScript to build/
npm run typecheck    # Type-check without emitting files
```

---

## Testing

```sh
npm test             # Run all tests with vitest (watch mode)
npm test -- --run    # Run tests once and exit
npm run test:coverage  # Run tests with coverage report
```

Tests are co-located with source files (`*.test.ts`).

---

## Linting & Formatting

```sh
npm run lint         # Lint with ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Check formatting with Prettier
npm run format:fix   # Auto-fix formatting
```

---

## Adding a New Tool

1. Create a new file in `src/tools/<toolset>/yourTool.ts`
2. Export a factory function following the `ToolDefinition` interface
3. Register the tool in `src/tools/tools.ts` under the appropriate toolset
4. Add a corresponding test file `src/tools/<toolset>/yourTool.test.ts`

### Example tool skeleton

```ts
import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const myToolSchema = z.object({
  projectKey: z.string().describe('The project key'),
});

export function myTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'my_tool',
    description: t('TOOL_MY_TOOL_DESCRIPTION', 'Default description'),
    schema: myToolSchema as unknown as z.ZodObject<z.ZodRawShape>,
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof myToolSchema>;
      return client.get(`/rest/api/3/project/${input.projectKey}`);
    },
  };
}
```

---

## Adding a New Toolset

1. Add tools to a new directory `src/tools/<newToolset>/`
2. Add the toolset entry in `src/tools/tools.ts`
3. Update the `--enable-toolsets` help text in `src/index.ts`
4. Document the new toolset in `docs/tools.md`
