import { describe, it, expect } from 'vitest';
import { mapIssue, mapSearchResult } from './mapIssue.js';

// ---------------------------------------------------------------------------
// Fixtures — realistic raw Jira API responses
// ---------------------------------------------------------------------------

const rawIssueV3 = {
  id: '10001',
  key: 'PROJ-1',
  self: 'https://example.atlassian.net/rest/api/3/issue/10001',
  expand: 'renderedFields,names,schema,operations',
  fields: {
    summary: 'Login button not working',
    description: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'The login button does nothing.' }],
        },
      ],
    },
    status: {
      self: 'https://example.atlassian.net/rest/api/3/status/1',
      id: '1',
      name: 'Open',
      iconUrl: 'https://example.atlassian.net/images/status.png',
      statusCategory: {
        self: 'https://example.atlassian.net/rest/api/3/statuscategory/2',
        id: 2,
        key: 'new',
        name: 'To Do',
        colorName: 'blue-gray',
      },
    },
    priority: {
      self: 'https://example.atlassian.net/rest/api/3/priority/1',
      iconUrl: 'https://example.atlassian.net/images/p1.png',
      name: 'High',
      id: '1',
    },
    issuetype: {
      self: 'https://example.atlassian.net/rest/api/3/issuetype/1',
      id: '1',
      description: 'A bug',
      iconUrl: 'https://example.atlassian.net/img/bug.png',
      name: 'Bug',
      subtask: false,
      avatarId: 10303,
      entityId: 'abc-123',
      hierarchyLevel: 0,
    },
    assignee: {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=abc',
      accountId: 'abc',
      emailAddress: 'alice@example.com',
      avatarUrls: { '48x48': 'https://avatar.example.com/48' },
      displayName: 'Alice',
      active: true,
      timeZone: 'UTC',
    },
    reporter: {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=def',
      accountId: 'def',
      displayName: 'Bob',
      active: true,
    },
    creator: {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=def',
      accountId: 'def',
      displayName: 'Bob',
    },
    created: '2025-01-01T00:00:00.000+0000',
    updated: '2025-01-02T00:00:00.000+0000',
    resolutiondate: null,
    labels: ['frontend', 'critical'],
    components: [
      { self: 'https://...', id: '100', name: 'Auth' },
      { self: 'https://...', id: '101', name: 'UI' },
    ],
    fixVersions: [{ self: 'https://...', id: '200', name: 'v1.2.0' }],
    parent: {
      id: '10000',
      key: 'PROJ-0',
      self: 'https://...',
      fields: { summary: 'Parent Epic' },
    },
    subtasks: [
      {
        id: '10002',
        key: 'PROJ-2',
        self: 'https://...',
        fields: {
          summary: 'Sub-task one',
          status: { name: 'Done' },
        },
      },
    ],
    comment: {
      comments: [
        {
          self: 'https://...',
          id: '20001',
          author: {
            self: 'https://...',
            accountId: 'abc',
            displayName: 'Alice',
            emailAddress: 'alice@example.com',
            avatarUrls: { '48x48': 'https://avatar.example.com/48' },
          },
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Investigating this issue.' }],
              },
            ],
          },
          created: '2025-01-01T12:00:00.000+0000',
          updated: '2025-01-01T12:00:00.000+0000',
        },
      ],
      maxResults: 1,
      total: 1,
      startAt: 0,
    },
    customfield_10001: 5,
    customfield_10002: {
      self: 'https://...',
      value: 'Team Alpha',
      id: '100',
    },
    customfield_10003: null,
    // Known noisy fields that should be ignored.
    customfield_10000:
      '{pullrequest={dataType=pullrequest, state=MERGED, stateCount=4}}',
    customfield_10020: [{ id: 1, name: 'Sprint 5', state: 'active' }],
    customfield_10022: '1|i00wqr:',
  },
};

const rawIssueV2 = {
  id: '10001',
  key: 'PROJ-1',
  self: 'https://jira.example.com/rest/api/2/issue/10001',
  fields: {
    summary: 'Login button not working',
    description: 'The login button does nothing.',
    status: { name: 'Open', statusCategory: { name: 'To Do' } },
    priority: { name: 'High' },
    issuetype: { name: 'Bug' },
    assignee: { displayName: 'Alice', emailAddress: 'alice@example.com' },
    reporter: { displayName: 'Bob' },
    creator: null,
    created: '2025-01-01T00:00:00.000+0000',
    updated: '2025-01-02T00:00:00.000+0000',
    labels: [],
    components: [],
    fixVersions: [],
    subtasks: [],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapIssue', () => {
  it('extracts core fields from a v3 issue', () => {
    const result = mapIssue(rawIssueV3, '3');

    expect(result.key).toBe('PROJ-1');
    expect(result.id).toBe('10001');
    expect(result.summary).toBe('Login button not working');
    expect(result.status).toBe('Open');
    expect(result.statusCategory).toBe('To Do');
    expect(result.priority).toBe('High');
    expect(result.issuetype).toBe('Bug');
  });

  it('omits creator when identical to reporter', () => {
    const result = mapIssue(rawIssueV3, '3');

    // Creator and reporter are both 'Bob' (no email) — creator is omitted.
    expect(result.reporter).toEqual({ displayName: 'Bob' });
    expect('creator' in result).toBe(false);
  });

  it('includes creator when different from reporter', () => {
    const modified = {
      ...rawIssueV3,
      fields: {
        ...(rawIssueV3.fields as Record<string, unknown>),
        creator: {
          displayName: 'Charlie',
          emailAddress: 'charlie@example.com',
        },
      },
    };
    const result = mapIssue(modified, '3');

    expect(result.creator).toEqual({
      displayName: 'Charlie',
      emailAddress: 'charlie@example.com',
    });
  });

  it('converts ADF description to Markdown for v3', () => {
    const result = mapIssue(rawIssueV3, '3');

    expect(result.description).toBe('The login button does nothing.');
  });

  it('preserves plain text description for v2', () => {
    const result = mapIssue(rawIssueV2, '2');

    expect(result.description).toBe('The login button does nothing.');
  });

  it('maps labels, components, fixVersions to simple arrays', () => {
    const result = mapIssue(rawIssueV3, '3');

    expect(result.labels).toEqual(['frontend', 'critical']);
    expect(result.components).toEqual(['Auth', 'UI']);
    expect(result.fixVersions).toEqual(['v1.2.0']);
  });

  it('maps parent to {key, summary}', () => {
    const result = mapIssue(rawIssueV3, '3');

    expect(result.parent).toEqual({ key: 'PROJ-0', summary: 'Parent Epic' });
  });

  it('maps subtasks', () => {
    const result = mapIssue(rawIssueV3, '3');

    expect(result.subtasks).toEqual([
      { key: 'PROJ-2', summary: 'Sub-task one', status: 'Done' },
    ]);
  });

  it('maps comments with ADF-to-Markdown body', () => {
    const result = mapIssue(rawIssueV3, '3');

    expect(result.comment).toHaveLength(1);
    expect(result.comment![0].author).toEqual({
      displayName: 'Alice',
      emailAddress: 'alice@example.com',
    });
    expect(result.comment![0].body).toBe('Investigating this issue.');
    expect(result.comment![0].created).toBe('2025-01-01T12:00:00.000+0000');
    // updated === created, so it should be omitted.
    expect('updated' in result.comment![0]).toBe(false);
  });

  it('includes comment updated when different from created', () => {
    const modified = {
      ...rawIssueV3,
      fields: {
        ...(rawIssueV3.fields as Record<string, unknown>),
        comment: {
          comments: [
            {
              author: { displayName: 'Alice' },
              body: 'Edited comment',
              created: '2025-01-01T12:00:00.000+0000',
              updated: '2025-01-02T15:00:00.000+0000',
            },
          ],
        },
      },
    };
    const result = mapIssue(modified, '2');

    expect(result.comment![0].updated).toBe('2025-01-02T15:00:00.000+0000');
  });

  it('preserves custom fields with noise stripped', () => {
    const result = mapIssue(rawIssueV3, '3');

    // Numeric custom field — kept as-is.
    expect(result.customfield_10001).toBe(5);
    // Object with value — extracted.
    expect(result.customfield_10002).toBe('Team Alpha');
    // Null — not included.
    expect('customfield_10003' in result).toBe(false);
  });

  it('ignores known noisy custom fields (rank, dev info, sprint)', () => {
    const result = mapIssue(rawIssueV3, '3');

    // customfield_10000 (dev info), customfield_10020 (sprint),
    // customfield_10022 (rank) should all be absent.
    expect('customfield_10000' in result).toBe(false);
    expect('customfield_10020' in result).toBe(false);
    expect('customfield_10022' in result).toBe(false);
  });

  it('strips self, expand, avatarUrls, accountId (not present in output)', () => {
    const result = mapIssue(rawIssueV3, '3');
    const json = JSON.stringify(result);

    expect(json).not.toContain('avatarUrls');
    expect(json).not.toContain('accountId');
    expect(json).not.toContain('"self"');
    expect(json).not.toContain('"expand"');
    expect(json).not.toContain('iconUrl');
  });

  it('handles null / missing fields gracefully', () => {
    const result = mapIssue({ id: '1', key: 'X-1', fields: {} }, '2');

    expect(result.key).toBe('X-1');
    expect(result.summary).toBeNull();
    expect(result.assignee).toBeNull();
    expect(result.labels).toEqual([]);
    expect(result.subtasks).toEqual([]);
    expect(result.parent).toBeNull();
  });

  it('returns an empty issue for null input', () => {
    const result = mapIssue(null, '3');
    expect(result.key).toBe('');
  });

  it('handles v2 issue with no comments', () => {
    const result = mapIssue(rawIssueV2, '2');

    expect(result.comment).toBeUndefined();
    expect(result.description).toBe('The login button does nothing.');
  });
});

describe('mapSearchResult', () => {
  it('maps a search wrapper preserving only pagination + mapped issues', () => {
    const raw = {
      expand: 'schema,names',
      startAt: 0,
      maxResults: 50,
      total: 1,
      issues: [rawIssueV3],
    };

    const result = mapSearchResult(raw, '3');

    expect(result.startAt).toBe(0);
    expect(result.maxResults).toBe(50);
    expect(result.total).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].key).toBe('PROJ-1');
    expect(result.issues[0].description).toBe('The login button does nothing.');
    // expand, schema, names are stripped.
    expect('expand' in result).toBe(false);
  });

  it('handles null input', () => {
    const result = mapSearchResult(null, '3');
    expect(result).toEqual({
      startAt: 0,
      maxResults: 0,
      total: 0,
      issues: [],
    });
  });

  it('handles empty issues array', () => {
    const result = mapSearchResult(
      { startAt: 0, maxResults: 50, total: 0, issues: [] },
      '2'
    );
    expect(result.issues).toEqual([]);
  });
});
