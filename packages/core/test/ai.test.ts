import { afterEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeProject } from '../src/analyze.js';
import { applyExplanations, explanationRequest, explainProject } from '../src/ai/explain.js';
import { configSchema } from '../src/config.js';
import { compareModels } from '../src/snapshot/compare.js';
import { copyFixture, put } from './helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('performs no network calls by default or in agent mode, and writes facts without source secrets', async () => {
  const network = vi.fn();
  vi.stubGlobal('fetch', network);
  const root = await copyFixture('bad');
  const before = await analyzeProject(root);
  await expect(readFile(path.join(root, '.overseer/explain-request.md'))).rejects.toThrow();
  await put(root, '.overseer/config.json', JSON.stringify({ ai: { mode: 'agent' } }));
  const pending = await analyzeProject(root);
  expect(pending.health).toBe(before.health);
  const request = await readFile(path.join(root, '.overseer/explain-request.md'), 'utf8');
  expect(request).not.toContain('sk_live_');
  expect(request).not.toContain('export const');
  expect(network).not.toHaveBeenCalled();
});

it('accepts cited agent explanations and rejects stale or invented file references', async () => {
  const root = await copyFixture();
  const before = await analyzeProject(root);
  const facts = explanationRequest(before, 'en');
  const response = {
    factsHash: facts.factsHash,
    features: [
      {
        id: '/results',
        name: 'Saved Results',
        description: 'Saves results through a checked API.',
        files: ['app/api/results/route.ts'],
      },
    ],
  };
  expect(
    applyExplanations(
      structuredClone(before),
      { ...response, factsHash: '0'.repeat(64) },
      facts.factsHash,
      'agent',
    ),
  ).toBe(false);
  expect(
    applyExplanations(
      structuredClone(before),
      { ...response, features: [{ ...response.features[0], files: ['invented.ts'] }] },
      facts.factsHash,
      'agent',
    ),
  ).toBe(false);
  await put(root, '.overseer/config.json', JSON.stringify({ ai: { mode: 'agent' } }));
  await put(root, '.overseer/explanations.json', JSON.stringify(response));
  const explained = await analyzeProject(root);
  expect(explained.features.find((item) => item.id === '/results')).toMatchObject({
    name: 'Saved Results',
    explanationSource: 'agent',
  });
  expect(explained.findings).toEqual(before.findings);
  expect(explained.health).toBe(before.health);
  expect(compareModels(before, explained).features.changed).toEqual([]);
  await put(root, '.overseer/explanations.json', '{broken');
  expect((await analyzeProject(root)).features.find((item) => item.id === '/results')?.name).toBe(
    'Results',
  );
});

it('sends a bounded JSON request only in explicit API mode and validates the response', async () => {
  const root = await copyFixture();
  const model = await analyzeProject(root);
  const request = explanationRequest(model, 'en');
  const network = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  factsHash: request.factsHash,
                  features: [
                    {
                      id: '/results',
                      name: 'Saved Results',
                      description: 'Saves results.',
                      files: ['app/api/results/route.ts'],
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  );
  vi.stubGlobal('fetch', network);
  vi.stubEnv('OVERSEER_TEST_KEY', 'synthetic-api-credential');
  const config = configSchema.parse({
    ai: {
      mode: 'api',
      endpoint: 'https://example.invalid/v1',
      model: 'test-model',
      keyEnv: 'OVERSEER_TEST_KEY',
    },
  });
  await explainProject(root, model, config.ai);
  expect(network).toHaveBeenCalledTimes(1);
  expect(network).toHaveBeenCalledWith(
    new URL('https://example.invalid/v1/chat/completions'),
    expect.objectContaining({
      redirect: 'error',
      signal: expect.any(AbortSignal),
      headers: expect.objectContaining({ Authorization: 'Bearer synthetic-api-credential' }),
    }),
  );
  expect(model.features.find((item) => item.id === '/results')?.explanationSource).toBe('api');
  expect(JSON.stringify(model)).not.toContain('synthetic-api-credential');
});

it('falls back on API failures and rejects non-loopback plain HTTP without sending', async () => {
  const root = await copyFixture();
  const model = await analyzeProject(root);
  const network = vi.fn(async () => {
    throw new Error('Provider failed');
  });
  vi.stubGlobal('fetch', network);
  await explainProject(
    root,
    model,
    configSchema.parse({
      ai: { mode: 'api', endpoint: 'http://example.invalid/v1', model: 'test' },
    }).ai,
  );
  expect(network).not.toHaveBeenCalled();
  await explainProject(
    root,
    model,
    configSchema.parse({
      ai: { mode: 'api', endpoint: 'http://127.0.0.1:11434/v1', model: 'test' },
    }).ai,
  );
  expect(network).toHaveBeenCalledTimes(1);
  expect(model.health).toBe(100);
  expect(model.diagnostics.at(-1)?.message).toContain('unchanged');
});

it('redacts embedded dependency URL credentials before they enter models or snapshots', async () => {
  const root = await copyFixture();
  await put(
    root,
    'package.json',
    JSON.stringify({
      dependencies: {
        next: '16.4.0',
        private: 'git+https://user:private-password@example.invalid/repo?token=private-token',
      },
    }),
  );
  const serialized = JSON.stringify(await analyzeProject(root));
  expect(serialized).not.toContain('private-password');
  expect(serialized).not.toContain('private-token');
});
