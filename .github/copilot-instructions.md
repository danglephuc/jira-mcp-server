# Copilot Instructions — jira-mcp-server

## Project Overview

Read-only MCP (Model Context Protocol) server that exposes Jira REST API operations as tools for AI assistants. Uses stdio transport. Node.js 20+ with ES modules (`"type": "module"`).

## Architecture

**Entry point:** `src/index.ts` — parses CLI/env config via `yargs` + `env-var`, creates `JiraClient`, builds toolset group, registers tools, starts stdio transport.

**Core flow:**

```
index.ts → allTools() → buildToolsetGroup() → registerTools() → composeToolHandler()
```

**Key layers:**

- `src/jira/client.ts` — thin HTTP client wrapping `fetch` with Basic Auth. Auto-selects API version: Cloud (email+token) → v3, Server/DC (username+password) → v2. Override with `JIRA_API_VERSION` env var. Throws `JiraApiError` on non-2xx.
- `src/tools/` — tool definitions grouped by toolset (`issue/`, `issueMetadata/`). Each file exports a factory function returning a `ToolDefinition`.
- `src/handlers/` — middleware pipeline assembled by `composeToolHandler` (see Error Handling below).
- `src/types/` — core interfaces: `ToolDefinition`, `Toolset`, `ToolsetGroup`, `SafeResult<T>`, `MCPOptions`.
- `src/utils/` — toolset filtering, tool registry deduplication, token counting, ADF→Markdown conversion, logger (pino).

## Tool Definition Pattern

Every tool follows the **factory function** pattern. The function takes `(client: JiraClient, { t }: TranslationHelper)` and returns a `ToolDefinition`:

```ts
import { z } from 'zod';
import { ToolDefinition } from '../../types/tool.js';
import { TranslationHelper } from '../../createTranslationHelper.js';
import { JiraClient } from '../../jira/client.js';

const mySchema = z.object({
  issueKey: z.string().describe('Issue key (e.g. "PROJ-123")'),
});

export function myTool(
  client: JiraClient,
  { t }: TranslationHelper
): ToolDefinition {
  return {
    name: 'my_tool',
    description: t('TOOL_MY_TOOL_DESCRIPTION', 'Default description'),
    schema: mySchema as unknown as z.ZodObject<z.ZodRawShape>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (rawInput: any) => {
      const input = rawInput as z.infer<typeof mySchema>;
      return client.get(`${client.apiBasePath}/issue/${input.issueKey}`);
    },
  };
}
```

After creating a tool file, register it in `src/tools/tools.ts` under the appropriate toolset.

## Error Handling & Handler Pipeline

Every tool handler is wrapped by a three-layer middleware pipeline in `composeToolHandler`:

1. **`wrapWithErrorHandling`** → wraps handler via `runToolSafely`. Catches any thrown error (including `JiraApiError`) and converts it to a `SafeResult` error instead of re-throwing. `JiraApiError` instances preserve `status` and `body` in the error result.
2. **`wrapWithTokenLimit`** → serializes `SafeResult.data` to JSON, counts approximate tokens. If output exceeds `maxTokens`, truncates and appends a `...(output truncated due to token limit)` notice.
3. **`wrapWithToolResult`** → converts `SafeResult` to the MCP SDK's `CallToolResult` shape (with `isError: true` for errors).

**Key rule:** Tool handlers should **never** throw intentionally. Just call `client.get()`/etc. and let the pipeline catch exceptions. The `SafeResult<T>` type (`src/types/result.ts`) is the internal contract between pipeline stages:

```ts
type SafeResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'error'; message: string; status?: number; details?: unknown };
```

## ADF→Markdown Conversion & Issue Mapping

Jira Cloud API v3 returns rich text as **Atlassian Document Format (ADF)** — a JSON tree. The `adfToMarkdown()` function (`src/utils/adfToMarkdown.ts`) converts this to Markdown, dramatically reducing token count for LLM consumption. It handles headings, lists, tables, code blocks, inline marks (bold, italic, links), mentions, panels, task lists, and more.

**Issue mapping** (`src/tools/issue/mapIssue.ts`) transforms raw Jira API responses into a lean `MappedIssue` shape for the LLM:

- Strips noise: avatar URLs, self links, account IDs, deeply nested metadata
- Converts ADF description/comments to Markdown (v3) or passes through plain text (v2)
- Cleans custom fields: extracts `name`/`value`/`displayName` from objects, drops known noisy fields (`IGNORED_CUSTOM_FIELDS` set)
- Deduplicates reporter/creator when identical

When adding new tools that return issue data, use `mapIssue()` to maintain consistent, token-efficient output.

## Configuration

Configuration is resolved from CLI flags → env vars → defaults (in that priority). Key env vars:

- `JIRA_URL` (required), `JIRA_EMAIL` + `JIRA_API_TOKEN` (Cloud), or `JIRA_USERNAME` + `JIRA_PASSWORD` (Server/DC)
- `JIRA_API_VERSION` — override auto-detected API version (`2` or `3`)
- `MAX_TOKENS` — max tokens per response (default: 50000)
- `PREFIX` — string prepended to all tool names (e.g., `jira_`)
- `ENABLE_TOOLSETS` — comma-separated list of toolsets to enable (default: `all`)

**Translation overrides:** Tool descriptions can be customized via `JIRA_MCP_TOOL_<KEY>_DESCRIPTION` env vars or a cosmiconfig file (searched from `$HOME`, name: `jira-mcp-server`).

## Important Conventions

- **Imports always use `.js` extensions** — required by NodeNext module resolution (e.g., `import { foo } from './bar.js'`), even when the source is `.ts`.
- **Zod schemas require a cast** — `schema: mySchema as unknown as z.ZodObject<z.ZodRawShape>` when the schema has specific field types.
- **Handler input typing** — handlers accept `any`, then cast: `const input = rawInput as z.infer<typeof mySchema>`. Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` above the handler line.
- **Translation keys** — use `t('TOOL_<NAME>_DESCRIPTION', 'fallback')` for all tool descriptions.
- **Tool registration deduplication** — `wrapServerWithToolRegistry` wraps `McpServer` with a `registerOnce` method that tracks names in a `Set` and skips duplicates.
- **API paths** — always use `client.apiBasePath` (resolves to `/rest/api/2` or `/rest/api/3`) rather than hardcoding the version.

## Commands

| Task             | Command                                 |
| ---------------- | --------------------------------------- |
| Dev (hot reload) | `npm run dev`                           |
| MCP Inspector UI | `npm run inspect` (localhost:6274)      |
| Build            | `npm run build` (tsc → `build/`)        |
| Type check only  | `npm run typecheck`                     |
| Tests (watch)    | `npm test`                              |
| Tests (once)     | `npm test -- --run`                     |
| Coverage         | `npm run test:coverage`                 |
| Lint             | `npm run lint` / `npm run lint:fix`     |
| Format           | `npm run format` / `npm run format:fix` |

## Testing

- **Framework:** Vitest with globals enabled. Tests are co-located: `src/foo.ts` → `src/foo.test.ts`.
- **Mocking:** Use `vi.fn()` for `JiraClient` methods. Create mock client objects typed as `Partial<JiraClient>` and cast (e.g., `{ get: vi.fn(), apiBasePath: '/rest/api/3' } as Partial<JiraClient> as JiraClient`). Use `createTranslationHelper()` directly (no mock needed — it works without config files).
- **Pattern:** `describe` → `beforeEach` (reset mocks) → `it` blocks. Assert with `expect()`.

## Adding a New Tool

1. Create `src/tools/<toolset>/yourTool.ts` following the factory function pattern above.
2. Create `src/tools/<toolset>/yourTool.test.ts` with mock client tests.
3. Add the import and register the tool in `src/tools/tools.ts` under the correct toolset array.
4. If adding a new toolset, also create a new directory, add the toolset entry in `tools.ts`, and update the `--enable-toolsets` help text in `src/index.ts`.
