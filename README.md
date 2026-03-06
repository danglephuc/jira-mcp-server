# jira-mcp-server

A **read-only** [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for querying Jira issue data via the Jira REST API. Designed to integrate seamlessly with AI assistants (e.g., Claude, Cursor, GitHub Copilot) that support MCP.

## Features

- 🔍 **Read-only access to Jira** — list issues, get issue details, query metadata
- 🔐 **Flexible authentication** — email + API token (Cloud) or username + password (Server/DC)
- 📦 **Toolset system** — enable only the tools you need
- 🔤 **Configurable tool prefix** — avoid naming conflicts across multiple MCP servers
- 🪙 **Token limiting** — automatically truncates oversized responses to avoid context overflow
- 🚀 **Zero local install** — run directly via `npx` without cloning the repo

## Available Tools

### Toolset: `issue`

| Tool         | Description                          | Jira Endpoint                     |
| ------------ | ------------------------------------ | --------------------------------- |
| `get_issues` | Search issues with JQL filters       | `GET /rest/api/3/search`          |
| `get_issue`  | Get a single issue with full details | `GET /rest/api/3/issue/:issueKey` |

### Toolset: `issue_metadata`

| Tool                 | Description                         | Jira Endpoint                    |
| -------------------- | ----------------------------------- | -------------------------------- |
| `get_projects`       | List all accessible projects        | `GET /rest/api/3/project/search` |
| `get_issue_types`    | List all issue types                | `GET /rest/api/3/issuetype`      |
| `get_issue_statuses` | List all issue statuses             | `GET /rest/api/3/status`         |
| `get_priorities`     | List all issue priorities           | `GET /rest/api/3/priority`       |
| `get_fields`         | List all fields (system and custom) | `GET /rest/api/3/field`          |

> Tools are prefixed with the value of `PREFIX` (e.g., `jira_get_issues`). See [Configuration](docs/configuration.md) for details.

## Quick Start

### Requirements

- Node.js 20+ (uses built-in `fetch` and ES modules)
- A Jira Cloud account with API access, or a Jira Server / Data Center instance
- A valid API token (Cloud) or username + password (Server/DC)

### Installation (via `npx`)

Add this to your MCP client configuration (e.g., Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "jira-mcp-server"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

> See [Configuration](docs/configuration.md) for all available environment variables and CLI flags.

## Documentation

| Document                               | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [Configuration](docs/configuration.md) | All environment variables, CLI flags, and auth options |
| [Tools Reference](docs/tools.md)       | Detailed parameters and examples for every tool        |
| [Architecture](docs/architecture.md)   | Project structure, key modules, and extension guide    |
| [Development](docs/development.md)     | How to run, build, test, and extend this project       |

## Development

```sh
npm install
npm run dev          # run with tsx (hot reload)
npm run inspect      # launch MCP Inspector UI at http://localhost:6274
npm run build        # type-check and compile to build/
npm run test         # run all tests with vitest
npm run test:coverage  # run tests with coverage
npm run lint         # lint with eslint
npm run format       # check formatting with prettier
```

## License

MIT
