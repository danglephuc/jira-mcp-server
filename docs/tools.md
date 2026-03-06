# Tools Reference

This document describes all available tools in the Jira MCP Server.

> Tool names are prefixed with the value of `PREFIX` (e.g., `jira_get_issues`).

---

## Toolset: `issue`

### `get_issues`

Search for Jira issues using JQL.

**Parameters:**

| Name         | Type            | Required | Description                                                    |
| ------------ | --------------- | -------- | -------------------------------------------------------------- |
| `jql`        | string          | No       | JQL query string (e.g. `"project = MYPROJ AND status = Open"`) |
| `fields`     | string          | No       | Comma-separated list of fields to include (default: all)       |
| `startAt`    | integer         | No       | Pagination offset (default: 0)                                 |
| `maxResults` | integer (1–100) | No       | Maximum results to return (default: 50)                        |
| `expand`     | string          | No       | Comma-separated expansions (e.g. `"renderedFields,names"`)     |

**Example:**

```json
{
  "jql": "project = PROJ AND assignee = currentUser() AND status != Done",
  "maxResults": 10
}
```

---

### `get_issue`

Retrieve detailed information about a specific Jira issue.

**Parameters:**

| Name       | Type   | Required | Description                                                    |
| ---------- | ------ | -------- | -------------------------------------------------------------- |
| `issueKey` | string | ✅ Yes   | Issue key or ID (e.g. `"PROJ-123"` or `"10001"`)               |
| `fields`   | string | No       | Comma-separated list of fields to include                      |
| `expand`   | string | No       | Comma-separated expansions (e.g. `"renderedFields,changelog"`) |

**Example:**

```json
{
  "issueKey": "PROJ-42",
  "expand": "renderedFields,changelog"
}
```

---

## Toolset: `issue_metadata`

### `get_projects`

List Jira projects accessible to the authenticated user.

**Parameters:**

| Name         | Type            | Required | Description                                                                 |
| ------------ | --------------- | -------- | --------------------------------------------------------------------------- |
| `query`      | string          | No       | Filter by project name or key (case-insensitive)                            |
| `startAt`    | integer         | No       | Pagination offset (default: 0)                                              |
| `maxResults` | integer (1–100) | No       | Maximum results to return (default: 50)                                     |
| `orderBy`    | string          | No       | Sort field: `category`, `issueCount`, `key`, `lastIssueUpdatedTime`, `name` |
| `expand`     | string          | No       | Comma-separated expansions (e.g. `"description,lead"`)                      |

---

### `get_issue_types`

List Jira issue types.

**Parameters:**

| Name        | Type   | Required | Description                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------- |
| `projectId` | string | No       | Filter issue types by project ID. Omit for all issue types. |

---

### `get_issue_statuses`

List Jira issue statuses.

**Parameters:**

| Name             | Type   | Required | Description                                         |
| ---------------- | ------ | -------- | --------------------------------------------------- |
| `projectIdOrKey` | string | No       | Filter by project ID or key. Omit for all statuses. |

---

### `get_priorities`

List all Jira issue priorities. No parameters required.

---

### `get_fields`

List all Jira fields (system and custom). No parameters required.
