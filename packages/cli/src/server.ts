import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProject, listSnapshots, saveSnapshot } from '@overseer/core';

export interface RunningServer {
  server: Server;
  url: string;
  close: () => Promise<void>;
}
export function webDirectory(): string {
  const packaged = new URL('../web/', import.meta.url);
  return fileURLToPath(
    existsSync(new URL('index.html', packaged))
      ? packaged
      : new URL('../../web/dist/', import.meta.url),
  );
}
export async function startServer(
  root: string,
  options: { port?: number; webRoot?: string } = {},
): Promise<RunningServer> {
  let model = await analyzeProject(root);
  await saveSnapshot(root, model);
  let snapshots = await listSnapshots(root);
  const token = randomBytes(24).toString('hex');
  const webRoot = path.resolve(options.webRoot ?? webDirectory());
  let url = '';
  let scanning = false;
  const payload = () => ({
    name: path.basename(path.resolve(root)),
    model,
    token,
    history: snapshots.map((item) => ({
      id: item.id,
      createdAt: item.model.createdAt,
      health: item.model.health,
      findings: item.model.findings.length,
    })),
  });
  const server = createServer((request, response) => {
    void (async () => {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      );
      function json(status: number, data: unknown): void {
        response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(data));
      }
      if (
        request.headers.host !== new URL(url).host ||
        (request.headers.origin && request.headers.origin !== url) ||
        request.headers['sec-fetch-site'] === 'cross-site'
      ) {
        json(403, { error: 'Only this local Overseer page can use the server.' });
        return;
      }
      const pathname = new URL(request.url ?? '/', url).pathname;
      if (pathname === '/api/data' && request.method === 'GET') {
        json(200, payload());
        return;
      }
      if (pathname === '/api/scan' && request.method === 'POST') {
        if (request.headers['x-overseer-token'] !== token) {
          json(403, { error: 'Refresh the page before scanning.' });
          return;
        }
        if (scanning) {
          json(409, { error: 'A scan is already running.' });
          return;
        }
        scanning = true;
        try {
          const updated = await analyzeProject(root);
          await saveSnapshot(root, updated);
          snapshots = await listSnapshots(root);
          model = updated;
          json(200, payload());
        } finally {
          scanning = false;
        }
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        json(405, { error: 'Method not allowed.' });
        return;
      }
      let relative: string;
      try {
        relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
      } catch {
        json(400, { error: 'Invalid path.' });
        return;
      }
      const target = path.resolve(webRoot, relative);
      if (!target.startsWith(webRoot + path.sep) || relative.includes('\\')) {
        json(404, { error: 'Not found.' });
        return;
      }
      try {
        const metadata = await stat(target);
        if (!metadata.isFile()) {
          json(404, { error: 'Not found.' });
          return;
        }
        const mime: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.ico': 'image/x-icon',
        };
        const type = mime[path.extname(target)];
        if (!type) {
          json(404, { error: 'Not found.' });
          return;
        }
        response.writeHead(200, { 'Content-Type': type });
        response.end(request.method === 'HEAD' ? undefined : await readFile(target));
      } catch {
        json(404, { error: 'Web assets were not found. Run pnpm build first.' });
      }
    })().catch(() => {
      if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          error:
            'The scan could not finish. Check the project files and configuration, then retry.',
        }),
      );
    });
  });
  server.requestTimeout = 15000;
  async function listen(port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const fail = (error: Error): void => {
        server.off('listening', ready);
        reject(error);
      };
      const ready = (): void => {
        server.off('error', fail);
        resolve();
      };
      server.once('error', fail);
      server.once('listening', ready);
      server.listen(port, '127.0.0.1');
    });
  }
  try {
    await listen(options.port ?? 4318);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE')
      await listen(0);
    else throw error;
  }
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('The local server did not get a port.');
  url = `http://127.0.0.1:${address.port}`;
  return {
    server,
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
