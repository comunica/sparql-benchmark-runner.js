import * as http from 'node:http';
import type { IncomingMessage } from 'node:http';
import * as https from 'node:https';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

/**
 * A minimal fetch implementation on top of Node's http module, with keep-alive connections.
 *
 * Its response body is a Node.js stream instead of a WHATWG stream,
 * which fetch-sparql-endpoint consumes directly without converting it.
 * This has a much lower overhead per request than the global fetch,
 * which would otherwise be included in the measured query times.
 *
 * @param input The URL to request.
 * @param init The request options.
 */
export function nodeHttpFetch(input: Request | string | URL, init: RequestInit = {}): Promise<Response> {
  if (typeof input !== 'string' && !(input instanceof URL)) {
    return fetch(input, init);
  }
  return new Promise<Response>((resolve, reject) => {
    const url = new URL(input);
    const headers: Record<string, string> = {};
    // eslint-disable-next-line unicorn/no-array-for-each
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const secure = url.protocol === 'https:';
    const request = (secure ? https : http).request(url, {
      method: init.method ?? 'GET',
      headers,
      agent: secure ? httpsAgent : httpAgent,
      signal: init.signal ?? undefined,
    }, (response: IncomingMessage) => resolve(<Response> <unknown> {
      ok: response.statusCode! >= 200 && response.statusCode! < 300,
      status: response.statusCode,
      headers: {
        get(name: string): string | null {
          const value = response.headers[name.toLowerCase()];
          return Array.isArray(value) ? value.join(', ') : value ?? null;
        },
      },
      body: response,
    }));
    request.on('error', reject);
    if (typeof init.body === 'string' || init.body instanceof URLSearchParams) {
      request.write(init.body.toString());
    } else if (init.body !== undefined && init.body !== null) {
      request.destroy();
      reject(new Error('Unsupported request body'));
      return;
    }
    request.end();
  });
}
