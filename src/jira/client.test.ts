import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JiraClient, JiraApiError } from './client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(
  status: number,
  body: unknown,
  contentType = 'application/json'
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name === 'content-type' ? contentType : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  });
}

function setupEnv() {
  process.env.JIRA_URL = 'https://example.atlassian.net';
  process.env.JIRA_EMAIL = 'user@example.com';
  process.env.JIRA_API_TOKEN = 'test-api-token';
  delete process.env.JIRA_USERNAME;
  delete process.env.JIRA_PASSWORD;
}

function clearEnv() {
  delete process.env.JIRA_URL;
  delete process.env.JIRA_EMAIL;
  delete process.env.JIRA_API_TOKEN;
  delete process.env.JIRA_USERNAME;
  delete process.env.JIRA_PASSWORD;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JiraApiError', () => {
  it('has the correct message, status, and body', () => {
    const err = new JiraApiError(404, {
      errorMessages: ['Issue does not exist'],
    });
    expect(err.message).toBe('Jira API error: 404');
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ errorMessages: ['Issue does not exist'] });
    expect(err).toBeInstanceOf(Error);
  });
});

describe('JiraClient', () => {
  beforeEach(() => {
    setupEnv();
  });

  afterEach(() => {
    clearEnv();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('initialises with JIRA_EMAIL + JIRA_API_TOKEN', () => {
      expect(() => new JiraClient()).not.toThrow();
    });

    it('initialises with JIRA_USERNAME + JIRA_PASSWORD', () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      process.env.JIRA_USERNAME = 'user';
      process.env.JIRA_PASSWORD = 'pass';
      expect(() => new JiraClient()).not.toThrow();
    });

    it('throws when neither email+token nor username+password are set', () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      expect(() => new JiraClient()).toThrow(
        'Jira authentication is not configured'
      );
    });

    it('throws when JIRA_URL is missing', () => {
      delete process.env.JIRA_URL;
      expect(() => new JiraClient()).toThrow();
    });

    it('strips a trailing slash from JIRA_URL', () => {
      process.env.JIRA_URL = 'https://example.atlassian.net/';
      const mockFetch = makeFetchMock(200, { issues: [] });
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      client.get('/rest/api/3/search');

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('//rest');
    });
  });

  // -------------------------------------------------------------------------
  // get() — happy path
  // -------------------------------------------------------------------------

  describe('get()', () => {
    it('returns parsed JSON body on a successful response', async () => {
      const responseBody = { issues: [{ id: '10001' }] };
      vi.stubGlobal('fetch', makeFetchMock(200, responseBody));

      const client = new JiraClient();
      const result = await client.get('/rest/api/3/search');

      expect(result).toEqual(responseBody);
    });

    it('sends the Authorization: Basic header (email+token)', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get('/rest/api/3/search');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('sends the Authorization: Basic header (username+password)', async () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      process.env.JIRA_USERNAME = 'alice';
      process.env.JIRA_PASSWORD = 'secret';

      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get('/rest/api/3/search');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('appends query params to the URL', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get('/rest/api/3/search', {
        jql: 'project = MYPROJ',
        maxResults: 10,
      });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('jql=');
      expect(calledUrl).toContain('maxResults=10');
    });

    it('skips null/undefined param values', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get('/rest/api/3/search', {
        jql: undefined as never,
        maxResults: 10,
      });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('jql=');
      expect(calledUrl).toContain('maxResults=10');
    });

    it('returns plain text when the response Content-Type is not JSON', async () => {
      vi.stubGlobal('fetch', makeFetchMock(200, 'plain text', 'text/plain'));

      const client = new JiraClient();
      const result = await client.get('/some/endpoint');
      expect(result).toBe('plain text');
    });

    // -------------------------------------------------------------------------
    // get() — error paths
    // -------------------------------------------------------------------------

    it('throws JiraApiError on a 404 response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetchMock(404, { errorMessages: ['Issue does not exist'] })
      );

      const client = new JiraClient();
      await expect(
        client.get('/rest/api/3/issue/PROJ-999')
      ).rejects.toBeInstanceOf(JiraApiError);
    });

    it('includes the HTTP status and body in the thrown JiraApiError', async () => {
      const errorBody = { errorMessages: ['Forbidden'] };
      vi.stubGlobal('fetch', makeFetchMock(403, errorBody));

      const client = new JiraClient();
      try {
        await client.get('/rest/api/3/search');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(JiraApiError);
        const apiErr = err as JiraApiError;
        expect(apiErr.status).toBe(403);
        expect(apiErr.body).toEqual(errorBody);
      }
    });

    it('throws JiraApiError on a 500 response', async () => {
      vi.stubGlobal('fetch', makeFetchMock(500, { error: 'Server error' }));

      const client = new JiraClient();
      await expect(client.get('/rest/api/3/search')).rejects.toBeInstanceOf(
        JiraApiError
      );
    });
  });
});
