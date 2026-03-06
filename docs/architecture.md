# Architecture

This document describes the internal structure of the Jira MCP Server, its key modules, and how they interact.

---

## Project Structure

```
jira-mcp-server/
├── src/
│   ├── index.ts                        # Entry point — wires everything together
│   ├── registerTools.ts                # Registers enabled toolsets onto the MCP server
│   ├── createTranslationHelper.ts      # Utility for collecting and exporting i18n-like strings
│   │
│   ├── jira/
│   │   └── client.ts                   # HTTP client for the Jira REST API
│   │
│   ├── tools/
│   │   ├── tools.ts                    # Declares all available toolsets
│   │   ├── issue/
│   │   │   ├── getIssues.ts            # Tool: search issues with JQL
│   │   │   └── getIssue.ts             # Tool: get single issue
│   │   └── issueMetadata/
│   │       ├── getProjects.ts
│   │       ├── getIssueTypes.ts
│   │       ├── getIssueStatuses.ts
│   │       ├── getPriorities.ts
│   │       └── getFields.ts
│   │
│   ├── handlers/
│   │   ├── builders/
│   │   │   └── composeToolHandler.ts   # Composes handler middleware pipeline
│   │   └── transformers/
│   │       ├── wrapWithErrorHandling.ts  # Catches errors, returns SafeResult
│   │       ├── wrapWithTokenLimit.ts     # Truncates oversized responses
│   │       └── wrapWithToolResult.ts     # Converts SafeResult to MCP CallToolResult
│   │
│   ├── utils/
│   │   ├── toolsetUtils.ts             # Toolset enable/filter logic
│   │   ├── wrapServerWithToolRegistry.ts  # Deduplication guard for tool registration
│   │   ├── runToolSafely.ts            # Executes tools and catches unexpected errors
│   │   ├── tokenCounter.ts             # Approximates token count
│   │   └── logger.ts                   # pino-based structured logger
│   │
│   └── types/
│       ├── tool.ts                     # ToolDefinition interface
│       ├── toolsets.ts                 # Toolset / ToolsetGroup interfaces
│       ├── result.ts                   # SafeResult<T> discriminated union
│       └── mcp.ts                      # MCPOptions interface
│
├── docs/                               # Project documentation (this folder)
├── build/                              # Compiled output (gitignored)
├── .env.example                        # Sample environment configuration
├── package.json
└── tsconfig.json
```

---

## Key Concepts

### Toolsets

A **toolset** is a named group of related tools. Toolsets can be enabled or disabled via the `ENABLE_TOOLSETS` environment variable.

```
ToolsetGroup
  └── Toolset[]            (e.g., "issue", "issue_metadata")
        └── ToolDefinition[]  (e.g., getIssuesTool, getIssueTool)
```

Each `ToolDefinition` contains:

- `name` – the tool name (without prefix)
- `description` – shown to the AI/LLM
- `schema` – Zod schema defining accepted parameters
- `handler` – async function implementing the tool's logic

---

### Handler Middleware Pipeline

Every tool's handler goes through a three-layer middleware pipeline assembled by `composeToolHandler`:

```
composeToolHandler(tool, options)
  │
  ├─ 1. wrapWithErrorHandling(handler)
  │       Wraps the raw handler. Catches any thrown error and returns
  │       SafeResult<T> = { kind: 'error', error: ... } instead of re-throwing.
  │
  ├─ 2. wrapWithTokenLimit(handler, maxTokens)
  │       Serializes the ok result to JSON and counts approximate tokens.
  │       If the output exceeds maxTokens, truncates and appends a notice.
  │
  └─ 3. wrapWithToolResult(handler)
          Converts SafeResult<T> to the MCP SDK's CallToolResult shape,
          which the MCP framework sends back to the client.
```

---

### SafeResult

Tools use a discriminated union to propagate results safely through the pipeline:

```ts
type SafeResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'error'; error: unknown };
```

---

### JiraClient

`src/jira/client.ts` is a thin HTTP client that:

- Reads `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_USERNAME`, `JIRA_PASSWORD` from environment variables at construction time
- Supports Jira Cloud (email + API token) and Jira Server/DC (username + password)
- Builds Basic Auth headers automatically
- Appends query params (skipping `null`/`undefined` values)
- Parses JSON responses or falls back to plain text
- Throws `JiraApiError` for non-2xx responses

---

### Tool Registration and Deduplication

`wrapServerWithToolRegistry` decorates the `McpServer` instance with a `registerOnce` method that tracks registered tool names in a `Set`. Any attempt to register the same name twice logs a warning and skips registration — preventing hard-to-debug duplicate tool errors.
