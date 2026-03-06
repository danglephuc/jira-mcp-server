# Configuration

This document describes all configuration options for the Jira MCP Server.

---

## Environment Variables

| Variable           | Required  | Description                                                                                                       |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `JIRA_URL`         | ✅ Yes    | Base URL of your Jira instance (e.g. `https://your-domain.atlassian.net`)                                         |
| `JIRA_EMAIL`       | ✅ Cloud  | Email address for Jira Cloud authentication                                                                       |
| `JIRA_API_TOKEN`   | ✅ Cloud  | API token for Jira Cloud (generate at https://id.atlassian.com/manage-profile/security/api-tokens)                |
| `JIRA_USERNAME`    | ✅ Server | Username for Jira Server / Data Center                                                                            |
| `JIRA_PASSWORD`    | ✅ Server | Password for Jira Server / Data Center                                                                            |
| `MAX_TOKENS`       | No        | Maximum number of tokens in a response before truncation (default: `50000`)                                       |
| `PREFIX`           | No        | String prefix for all tool names (e.g. `jira_` → `jira_get_issues`)                                               |
| `ENABLE_TOOLSETS`  | No        | Comma-separated list of toolsets to enable (default: `all`)                                                       |
| `JIRA_API_VERSION` | No        | Jira REST API version (`2` or `3`). Default: `2`. Use `2` for Server/DC; use `3` for Jira Cloud ADF descriptions. |
| `LOG_LEVEL`        | No        | Pino log level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`)                                       |

---

## Authentication

### Jira Cloud (recommended)

Use an email address and an API token:

```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-api-token
```

Generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens

### Jira Server / Data Center

Use a username and password:

```env
JIRA_URL=https://jira.your-company.com
JIRA_USERNAME=your-username
JIRA_PASSWORD=your-password
```

---

## CLI Flags

All environment variables have equivalent CLI flags:

| Flag                       | Description                                |
| -------------------------- | ------------------------------------------ |
| `--max-tokens <n>`         | Maximum tokens in response                 |
| `--prefix <string>`        | Tool name prefix                           |
| `--enable-toolsets <list>` | Space-separated list of toolsets to enable |
| `--export-translations`    | Print all translation keys and exit        |

---

## Toolsets

| Name             | Description                            |
| ---------------- | -------------------------------------- |
| `issue`          | Tools for querying Jira issues         |
| `issue_metadata` | Tools for querying Jira issue metadata |

To enable specific toolsets:

```env
ENABLE_TOOLSETS=issue,issue_metadata
```

Or enable all (default):

```env
ENABLE_TOOLSETS=all
```

---

## Translations / Overrides

Tool descriptions can be overridden via environment variables or a config file.

Environment variable format: `JIRA_MCP_<KEY_UPPERCASE>`

Config file: place a file named `.jira-mcp-server.json` (or `.jira-mcp-serverrc`) in your home directory:

```json
{
  "TOOL_GET_ISSUES_DESCRIPTION": "Custom description for get_issues"
}
```
