import dotenv from 'dotenv';
import env from 'env-var';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

dotenv.config();

// Rely on the global fetch provided by modern Node.js runtimes.
// Typing is kept loose here to avoid depending on DOM lib types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const fetch: any;

export class JiraApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Jira API error: ${status}`);
    this.status = status;
    this.body = body;
  }
}

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  readonly apiBasePath: string;
  readonly apiVersion: string;

  constructor() {
    this.baseUrl = env
      .get('JIRA_URL')
      .required()
      .asString()
      .replace(/\/+$/, '');

    const email = env.get('JIRA_EMAIL').asString();
    const apiToken = env.get('JIRA_API_TOKEN').asString();
    const username = env.get('JIRA_USERNAME').asString();
    const password = env.get('JIRA_PASSWORD').asString();

    if (email && apiToken) {
      // Jira Cloud: email + API token
      const encoded = Buffer.from(`${email}:${apiToken}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else if (username && password) {
      // Jira Server / Data Center: username + password
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      throw new Error(
        'Jira authentication is not configured. Set JIRA_EMAIL and JIRA_API_TOKEN (Cloud), or JIRA_USERNAME and JIRA_PASSWORD (Server/DC).'
      );
    }

    // At this point authentication was successfully determined.
    // Jira Cloud (email+token) requires API v3: some v2 endpoints were permanently
    // removed (HTTP 410). Jira Server/DC only has v2 (v3 returns 404).
    // JIRA_API_VERSION always overrides the auto-detected default.
    const defaultApiVersion = email && apiToken ? '3' : '2';
    const apiVersion = env
      .get('JIRA_API_VERSION')
      .default(defaultApiVersion)
      .asString();
    this.apiVersion = apiVersion;
    this.apiBasePath = `/rest/api/${apiVersion}`;
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      throw new JiraApiError(res.status, body);
    }

    return body as T;
  }
}
