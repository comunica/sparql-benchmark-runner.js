import * as http from 'node:http';
import * as https from 'node:https';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { nodeHttpFetch } from '../lib/NodeHttpFetch';

describe('nodeHttpFetch', () => {
  let server: http.Server;
  let url: string;
  let requests: { method?: string; url?: string; headers: http.IncomingHttpHeaders; body: string }[];

  beforeAll(async() => {
    server = http.createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        requests.push({ method: request.method, url: request.url, headers: request.headers, body });
        if (request.url === '/hang') {
          return;
        }
        response.setHeader('Set-Cookie', [ 'a=1', 'b=2' ]);
        response.writeHead(request.url === '/missing' ? 404 : 200, { 'Content-Type': 'text/plain' });
        response.end('ok');
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(<AddressInfo> server.address()).port}`;
  });

  beforeEach(() => {
    requests = [];
  });

  afterAll(async() => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  async function readBody(response: Response): Promise<string> {
    let body = '';
    for await (const chunk of <Readable> <unknown> response.body) {
      body += chunk;
    }
    return body;
  }

  it('sends GET requests with headers', async() => {
    const response = await nodeHttpFetch(`${url}/sparql?query=a`, { headers: { accept: 'text/plain' }});

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(response.headers.get('Set-Cookie')).toBe('a=1, b=2');
    expect(response.headers.get('X-Missing')).toBeNull();
    expect(response.body).toBeInstanceOf(Readable);
    await expect(readBody(response)).resolves.toBe('ok');
    expect(requests).toEqual([
      expect.objectContaining({ method: 'GET', url: '/sparql?query=a', body: '' }),
    ]);
    expect(requests[0].headers.accept).toBe('text/plain');
  });

  it('sends POST requests with a body', async() => {
    const response = await nodeHttpFetch(new URL(`${url}/sparql`), {
      method: 'POST',
      body: new URLSearchParams({ query: 'a' }),
    });

    expect(response.ok).toBe(true);
    await readBody(response);
    expect(requests).toEqual([
      expect.objectContaining({ method: 'POST', url: '/sparql', body: 'query=a' }),
    ]);
  });

  it('marks unsuccessful responses as not ok', async() => {
    const response = await nodeHttpFetch(`${url}/missing`);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    await readBody(response);
  });

  it('rejects aborted requests', async() => {
    const controller = new AbortController();
    const response = nodeHttpFetch(`${url}/hang`, { signal: controller.signal });
    await new Promise(resolve => setTimeout(resolve, 50));
    controller.abort();

    await expect(response).rejects.toThrow('The operation was aborted');
  });

  it('rejects for failing requests', async() => {
    await expect(nodeHttpFetch('http://127.0.0.1:1/')).rejects.toThrow('ECONNREFUSED');
  });

  it('uses https for https URLs', async() => {
    const request = jest.spyOn(https, 'request').mockImplementation(<any> ((_url: URL, options: any, callback: any) => {
      expect(options.agent).toBeInstanceOf(https.Agent);
      const fakeRequest: any = Object.assign(new Readable({ read() {} }), {
        write: jest.fn(),
        end: () => callback(Object.assign(Readable.from([]), { statusCode: 200, headers: {}})),
      });
      return fakeRequest;
    }));
    const response = await nodeHttpFetch('https://example.org/');

    expect(response.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    request.mockRestore();
  });

  it('rejects unsupported request bodies', async() => {
    await expect(nodeHttpFetch(`${url}/sparql`, { method: 'POST', body: new Blob([ 'a' ]) }))
      .rejects.toThrow('Unsupported request body');
  });

  it('delegates Request objects to the global fetch', async() => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(<Response> { ok: true });
    const request = new Request('http://example.org/');
    await nodeHttpFetch(request, { method: 'GET' });

    expect(fetchSpy).toHaveBeenCalledWith(request, { method: 'GET' });
    fetchSpy.mockRestore();
  });
});
