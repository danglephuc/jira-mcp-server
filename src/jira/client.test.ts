import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Buffer } from 'node:buffer';
import { JiraClient, JiraApiError } from './client.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    createWriteStream: vi.fn(() => {
      const { PassThrough } = require('node:stream');
      return new PassThrough();
    }),
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

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
  delete process.env.JIRA_API_VERSION;
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
      client.get(`${client.apiBasePath}/search`);

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('//rest');
    });

    it('defaults apiBasePath to /rest/api/3 for Cloud credentials (email+token)', () => {
      delete process.env.JIRA_API_VERSION;
      const client = new JiraClient();
      expect(client.apiBasePath).toBe('/rest/api/3');
      expect(client.apiVersion).toBe('3');
    });

    it('defaults apiBasePath to /rest/api/2 for Server/DC credentials (username+password)', () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_API_VERSION;
      process.env.JIRA_USERNAME = 'user';
      process.env.JIRA_PASSWORD = 'pass';
      const client = new JiraClient();
      expect(client.apiBasePath).toBe('/rest/api/2');
      expect(client.apiVersion).toBe('2');
    });

    it('JIRA_API_VERSION=2 overrides Cloud default of 3', () => {
      process.env.JIRA_API_VERSION = '2';
      const client = new JiraClient();
      expect(client.apiBasePath).toBe('/rest/api/2');
      expect(client.apiVersion).toBe('2');
    });

    it('JIRA_API_VERSION=3 overrides Server/DC default of 2', () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      process.env.JIRA_USERNAME = 'user';
      process.env.JIRA_PASSWORD = 'pass';
      process.env.JIRA_API_VERSION = '3';
      const client = new JiraClient();
      expect(client.apiBasePath).toBe('/rest/api/3');
      expect(client.apiVersion).toBe('3');
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
      const result = await client.get(`${client.apiBasePath}/search`);

      expect(result).toEqual(responseBody);
    });

    it('sends the Authorization: Basic header (email+token)', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get(`${client.apiBasePath}/search`);

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
      await client.get(`${client.apiBasePath}/search`);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('appends query params to the URL', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get(`${client.apiBasePath}/search`, {
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
      await client.get(`${client.apiBasePath}/search`, {
        jql: undefined as never,
        maxResults: 10,
      });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('jql=');
      expect(calledUrl).toContain('maxResults=10');
    });

    it('includes /rest/api/3 in the request URL by default for Cloud credentials', async () => {
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get(`${client.apiBasePath}/issue/CLOUD-123`);

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/rest/api/3/issue/CLOUD-123');
    });

    it('includes /rest/api/2 in the request URL by default for Server/DC credentials', async () => {
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      process.env.JIRA_USERNAME = 'user';
      process.env.JIRA_PASSWORD = 'pass';
      const mockFetch = makeFetchMock(200, {});
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.get(`${client.apiBasePath}/issue/SFITLOCAL-1476`);

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/rest/api/2/issue/SFITLOCAL-1476');
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
        client.get(`${client.apiBasePath}/issue/PROJ-999`)
      ).rejects.toBeInstanceOf(JiraApiError);
    });

    it('includes the HTTP status and body in the thrown JiraApiError', async () => {
      const errorBody = { errorMessages: ['Forbidden'] };
      vi.stubGlobal('fetch', makeFetchMock(403, errorBody));

      const client = new JiraClient();
      try {
        await client.get(`${client.apiBasePath}/search`);
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
      await expect(
        client.get(`${client.apiBasePath}/search`)
      ).rejects.toBeInstanceOf(JiraApiError);
    });
  });

  // -------------------------------------------------------------------------
  // getAttachmentBuffer()
  // -------------------------------------------------------------------------

  describe('getAttachmentBuffer()', () => {
    function makeBinaryFetchMock(
      status: number,
      data: Uint8Array,
      contentType = 'image/png'
    ) {
      return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: {
          get: (name: string) => (name === 'content-type' ? contentType : null),
        },
        arrayBuffer: () => Promise.resolve(data.buffer),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    }

    it('returns base64-encoded data and mime type on success', async () => {
      const payload = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
      vi.stubGlobal('fetch', makeBinaryFetchMock(200, payload, 'image/png'));

      const client = new JiraClient();
      const result = await client.getAttachmentBuffer(
        'https://example.atlassian.net/secure/attachment/10010/screenshot.png'
      );

      expect(result.base64).toBe(Buffer.from(payload).toString('base64'));
      expect(result.mimeType).toBe('image/png');
    });

    it('sends the Authorization header', async () => {
      const payload = new Uint8Array([0]);
      const mockFetch = makeBinaryFetchMock(200, payload);
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.getAttachmentBuffer('https://example.atlassian.net/file');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('defaults mimeType to application/octet-stream when not provided', async () => {
      const payload = new Uint8Array([1, 2, 3]);
      vi.stubGlobal(
        'fetch',
        makeBinaryFetchMock(200, payload, null as unknown as string)
      );

      const client = new JiraClient();
      const result = await client.getAttachmentBuffer(
        'https://example.atlassian.net/file'
      );

      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('throws JiraApiError on a non-OK response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetchMock(404, { errorMessages: ['Not found'] })
      );

      const client = new JiraClient();
      await expect(
        client.getAttachmentBuffer('https://example.atlassian.net/file')
      ).rejects.toBeInstanceOf(JiraApiError);
    });
  });

  // -------------------------------------------------------------------------
  // downloadAttachmentToFile()
  // -------------------------------------------------------------------------

  describe('downloadAttachmentToFile()', () => {
    function makeStreamFetchMock(
      status: number,
      data: Uint8Array,
      contentType = 'image/png'
    ) {
      const { Readable } = require('node:stream');
      const readable = Readable.from([Buffer.from(data)]);
      // Convert to a web ReadableStream
      const webStream = Readable.toWeb(readable);

      return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? contentType : null,
        },
        body: webStream,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    }

    it('streams data to a file on disk', async () => {
      const payload = new Uint8Array([137, 80, 78, 71]);
      const mockFetch = makeStreamFetchMock(200, payload);
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await expect(
        client.downloadAttachmentToFile(
          'https://example.atlassian.net/secure/attachment/10010/screenshot.png',
          '/tmp/test/screenshot.png'
        )
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.atlassian.net/secure/attachment/10010/screenshot.png',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: expect.any(String) }),
        })
      );
    });

    it('sends the Authorization header', async () => {
      const payload = new Uint8Array([0]);
      const mockFetch = makeStreamFetchMock(200, payload);
      vi.stubGlobal('fetch', mockFetch);

      const client = new JiraClient();
      await client.downloadAttachmentToFile(
        'https://example.atlassian.net/file',
        '/tmp/out.bin'
      );

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('throws JiraApiError on a non-OK response', async () => {
      vi.stubGlobal(
        'fetch',
        makeFetchMock(404, { errorMessages: ['Not found'] })
      );

      const client = new JiraClient();
      await expect(
        client.downloadAttachmentToFile(
          'https://example.atlassian.net/file',
          '/tmp/out.bin'
        )
      ).rejects.toBeInstanceOf(JiraApiError);
    });

    it('throws when response body is empty', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: () => 'image/png',
          },
          body: null,
        })
      );

      const client = new JiraClient();
      await expect(
        client.downloadAttachmentToFile(
          'https://example.atlassian.net/file',
          '/tmp/out.bin'
        )
      ).rejects.toThrow('Response body is empty');
    });
  });
});
