import { expect, it } from 'vitest';
import { startServer } from '../src/server.js';
import { copyFixture, put } from '../../core/test/helpers.js';
import path from 'node:path';
import { get } from 'node:http';

it('serves local facts, blocks cross-origin access, and requires a rescan token', async () => {
  const root = await copyFixture();
  const webRoot = path.join(root, 'web-test');
  await put(root, 'web-test/index.html', '<!doctype html><title>Overseer</title>');
  const running = await startServer(root, { port: 0, webRoot });
  try {
    expect(running.server.address()).toMatchObject({ address: '127.0.0.1' });
    expect((await fetch(running.url)).status).toBe(200);
    expect((await fetch(`${running.url}/package.json`)).status).toBe(404);
    expect(
      (await fetch(`${running.url}/api/data`, { headers: { Origin: 'https://example.invalid' } }))
        .status,
    ).toBe(403);
    const forgedHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      get(`${running.url}/api/data`, { headers: { Host: 'example.invalid' } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }).on('error', reject);
    });
    expect(forgedHostStatus).toBe(403);
    expect((await fetch(`${running.url}/api/scan`, { method: 'POST' })).status).toBe(403);
    const data: unknown = await (await fetch(`${running.url}/api/data`)).json();
    expect(data).toMatchObject({ model: { health: 100 }, history: [{ health: 100 }] });
    if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string')
      throw new Error('Missing token');
    expect(
      (
        await fetch(`${running.url}/api/scan`, {
          method: 'POST',
          headers: { 'X-Overseer-Token': data.token },
        })
      ).status,
    ).toBe(200);
    const address = running.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing port');
    const second = await startServer(root, { port: address.port, webRoot });
    expect(second.url).not.toBe(running.url);
    await second.close();
  } finally {
    await running.close();
  }
});
