/**
 * Shared response mapper for Jira issue objects.
 *
 * Extracts only the fields relevant for an LLM, stripping noise like avatar
 * URLs, self links, account IDs, and deeply nested metadata. ADF fields
 * (description, comments) are converted to Markdown when using API v3.
 */

import { adfToMarkdown } from '../../utils/adfToMarkdown.js';

// ---------------------------------------------------------------------------
// Public types — the lean shapes returned to the LLM
// ---------------------------------------------------------------------------

export interface MappedUser {
  displayName: string | null;
  emailAddress?: string;
}

export interface MappedComment {
  author: MappedUser | null;
  body: string;
  created: string;
  updated?: string;
}

export interface MappedIssue {
  key: string;
  id: string;
  summary: string | null;
  status: string | null;
  statusCategory: string | null;
  priority: string | null;
  issuetype: string | null;
  assignee: MappedUser | null;
  reporter: MappedUser | null;
  creator?: MappedUser | null;
  created: string | null;
  updated: string | null;
  resolved: string | null;
  description: string | null;
  labels: string[];
  components: string[];
  fixVersions: string[];
  parent: { key: string; summary: string } | null;
  subtasks: { key: string; summary: string; status: string | null }[];
  comment?: MappedComment[];
  // Custom fields are kept as-is but with nested noise stripped.
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapUser(user: unknown): MappedUser | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  return {
    displayName: (u.displayName as string) ?? null,
    ...(u.emailAddress ? { emailAddress: u.emailAddress as string } : {}),
  };
}

function mapDescription(
  description: unknown,
  apiVersion: string
): string | null {
  if (description === null || description === undefined) return null;
  // API v2 returns plain text; v3 returns ADF.
  if (typeof description === 'string') return description;
  if (apiVersion === '3' || apiVersion === 'latest') {
    return adfToMarkdown(description) || null;
  }
  // Fallback: try ADF conversion anyway (in case of custom config).
  return adfToMarkdown(description) || null;
}

function mapCommentBody(body: unknown, apiVersion: string): string {
  if (typeof body === 'string') return body;
  if (apiVersion === '3' || apiVersion === 'latest') {
    return adfToMarkdown(body);
  }
  return adfToMarkdown(body) || JSON.stringify(body);
}

function nameOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  return ((value as Record<string, unknown>).name as string) ?? null;
}

function usersEqual(a: MappedUser | null, b: MappedUser | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.displayName === b.displayName && a.emailAddress === b.emailAddress;
}

function isCustomField(key: string): boolean {
  return key.startsWith('customfield_');
}

/**
 * Custom fields that are always noise for the LLM. These contain internal Jira
 * metadata (rank ordering, dev-tool integrations, sprint JSON, etc.) that have
 * no semantic value.
 */
const IGNORED_CUSTOM_FIELDS = new Set([
  'customfield_10000', // Dev info (PR / branch / commit data) — large JSON blob
  'customfield_10020', // Sprint — verbose internal sprint metadata
  'customfield_10022', // Rank — opaque ordering string (e.g. "1|i00wqr:")
]);

/**
 * Heuristic: if a cleaned custom field value is a string that looks like a
 * serialised object (starts with '{' and contains '='), it is almost certainly
 * Jira internal metadata that leaked through and should be dropped.
 */
function isNoisyStringValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (
    (trimmed.startsWith('{') && trimmed.includes('=')) ||
    (trimmed.startsWith('{') && trimmed.includes('dataType'))
  );
}

/**
 * Strip noise from custom field values. If the value is an object with a
 * `name` or `value` property, extract that. Arrays are mapped element-wise.
 */
function cleanCustomFieldValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(cleanCustomFieldValue);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Common patterns: { name: '...' }, { value: '...' }, { displayName: '...' }
    if ('name' in obj && typeof obj.name === 'string') return obj.name;
    if ('value' in obj && typeof obj.value === 'string') return obj.value;
    if ('displayName' in obj && typeof obj.displayName === 'string')
      return obj.displayName;
    // If it has an ADF-like structure, convert it.
    if ('type' in obj && obj.type === 'doc') return adfToMarkdown(obj) || null;
    return value;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map a raw Jira issue object to a lean representation.
 *
 * @param raw  The raw issue JSON from the Jira API.
 * @param apiVersion  The API version ('2', '3', or 'latest').
 */
export function mapIssue(raw: unknown, apiVersion: string): MappedIssue {
  if (!raw || typeof raw !== 'object') {
    return emptyIssue();
  }
  const issue = raw as Record<string, unknown>;
  const fields = (issue.fields ?? {}) as Record<string, unknown>;

  const mapped: MappedIssue = {
    key: (issue.key as string) ?? '',
    id: (issue.id as string) ?? '',
    summary: (fields.summary as string) ?? null,
    status: nameOf(fields.status),
    statusCategory: fields.status
      ? nameOf((fields.status as Record<string, unknown>).statusCategory)
      : null,
    priority: nameOf(fields.priority),
    issuetype: nameOf(fields.issuetype),
    assignee: mapUser(fields.assignee),
    reporter: mapUser(fields.reporter),
    creator: usersEqual(mapUser(fields.reporter), mapUser(fields.creator))
      ? (undefined as unknown as MappedUser | null)
      : mapUser(fields.creator),
    created: (fields.created as string) ?? null,
    updated: (fields.updated as string) ?? null,
    resolved: (fields.resolutiondate as string) ?? null,
    description: mapDescription(fields.description, apiVersion),
    labels: Array.isArray(fields.labels) ? fields.labels : [],
    components: Array.isArray(fields.components)
      ? (fields.components.map(nameOf).filter(Boolean) as string[])
      : [],
    fixVersions: Array.isArray(fields.fixVersions)
      ? (fields.fixVersions.map(nameOf).filter(Boolean) as string[])
      : [],
    parent: fields.parent
      ? {
          key: ((fields.parent as Record<string, unknown>).key as string) ?? '',
          summary:
            ((
              (fields.parent as Record<string, unknown>).fields as Record<
                string,
                unknown
              >
            )?.summary as string) ?? '',
        }
      : null,
    subtasks: Array.isArray(fields.subtasks)
      ? fields.subtasks.map((s: unknown) => {
          const sub = s as Record<string, unknown>;
          const subFields = (sub.fields ?? {}) as Record<string, unknown>;
          return {
            key: (sub.key as string) ?? '',
            summary: (subFields.summary as string) ?? '',
            status: nameOf(subFields.status),
          };
        })
      : [],
  };

  // Comments (present when 'comment' field is included or expanded).
  const commentWrapper = fields.comment as { comments?: unknown[] } | undefined;
  if (commentWrapper?.comments && Array.isArray(commentWrapper.comments)) {
    mapped.comment = commentWrapper.comments.map((c) => {
      const comment = c as Record<string, unknown>;
      return {
        author: mapUser(comment.author),
        body: mapCommentBody(comment.body, apiVersion),
        created: (comment.created as string) ?? '',
        // Only include `updated` when it differs from `created`.
        ...(comment.updated && comment.updated !== comment.created
          ? { updated: comment.updated as string }
          : {}),
      };
    });
  }

  // Preserve custom fields with noise stripped.
  for (const key of Object.keys(fields)) {
    if (
      isCustomField(key) &&
      fields[key] !== null &&
      fields[key] !== undefined &&
      !IGNORED_CUSTOM_FIELDS.has(key)
    ) {
      const cleaned = cleanCustomFieldValue(fields[key]);
      // Drop values that are still noisy after cleaning.
      if (
        cleaned !== null &&
        cleaned !== undefined &&
        !isNoisyStringValue(cleaned)
      ) {
        mapped[key] = cleaned;
      }
    }
  }

  // Omit `creator` key entirely when it was set to undefined (same as reporter).
  if (mapped.creator === undefined) {
    delete mapped.creator;
  }

  return mapped;
}

/**
 * Map the paginated search response wrapper, keeping only pagination metadata
 * and mapped issues.
 */
export function mapSearchResult(
  raw: unknown,
  apiVersion: string
): {
  startAt: number;
  maxResults: number;
  total: number;
  issues: MappedIssue[];
} {
  if (!raw || typeof raw !== 'object') {
    return { startAt: 0, maxResults: 0, total: 0, issues: [] };
  }
  const data = raw as Record<string, unknown>;
  return {
    startAt: (data.startAt as number) ?? 0,
    maxResults: (data.maxResults as number) ?? 0,
    total: (data.total as number) ?? 0,
    issues: Array.isArray(data.issues)
      ? data.issues.map((issue) => mapIssue(issue, apiVersion))
      : [],
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function emptyIssue(): MappedIssue {
  return {
    key: '',
    id: '',
    summary: null,
    status: null,
    statusCategory: null,
    priority: null,
    issuetype: null,
    assignee: null,
    reporter: null,
    created: null,
    updated: null,
    resolved: null,
    description: null,
    labels: [],
    components: [],
    fixVersions: [],
    parent: null,
    subtasks: [],
  };
}
