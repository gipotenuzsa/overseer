import { expect, it } from 'vitest';
import { readFile, unlink, cp } from 'node:fs/promises';
import path from 'node:path';
import { analyzeProject } from '../src/analyze.js';
import { saveSnapshot, listSnapshots } from '../src/snapshot/store.js';
import { compareModels } from '../src/snapshot/compare.js';
import { modelAtRef } from '../src/snapshot/git-ref.js';
import { git } from '../src/scanner/git.js';
import { copyFixture, put, fixture } from './helpers.js';

it('saves validated models atomically and compares repeated scans and deletions', async () => {
  const root = await copyFixture();
  expect(await listSnapshots(root)).toEqual([]);
  const before = await analyzeProject(root);
  const first = compareModels(undefined, before);
  expect(first.firstRun).toBe(true);
  await saveSnapshot(root, before);
  const saved = (await listSnapshots(root)).at(-1)!.model;
  expect(saved).toEqual(before);
  const repeated = compareModels(saved, await analyzeProject(root));
  expect(repeated.files).toEqual({ added: [], removed: [], changed: [] });
  expect(repeated.findings).toEqual({ added: [], resolved: [] });
  await unlink(path.join(root, 'app/api/status/route.ts'));
  const removed = compareModels(saved, await analyzeProject(root));
  expect(removed.apis.removed).toEqual(['/api/status']);
  expect(removed.features.removed).toEqual(['/api/status']);
});

it('shows new and resolved findings, dependencies, changed features, risk and health', async () => {
  const root = await copyFixture();
  const before = await analyzeProject(root);
  await put(
    root,
    'lib/server.ts',
    (await readFile(path.join(root, 'lib/server.ts'), 'utf8')) +
      "\nexport const secretKey = 'sk_live_OVERSEER_SYNTHETIC_TEST_VALUE_0123456789';\n",
  );
  const manifest: unknown = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  await put(
    root,
    'package.json',
    JSON.stringify({
      ...(manifest as object),
      dependencies: { ...before.dependencies, nanoid: '5.1.6' },
    }),
  );
  const after = await analyzeProject(root, before);
  const report = compareModels(before, after);
  expect(report.dependencies.added).toEqual(['nanoid']);
  expect(report.features.changed).toContain('/results');
  expect(report.findings.added.map((item) => item.checkId).sort()).toEqual([
    'new-dependency',
    'secret-in-code',
  ]);
  expect(report.health).toEqual({ before: 100, after: 84 });
  expect(report.risk).toBe('high');
  expect(compareModels(after, before).findings.resolved.map((item) => item.checkId)).toEqual([
    'secret-in-code',
  ]);
  const id = await saveSnapshot(root, after);
  expect(await readFile(path.join(root, '.overseer/snapshots', id), 'utf8')).not.toContain(
    'sk_live_',
  );
  expect(
    (await listSnapshots(root))
      .at(-1)
      ?.model.findings.some((item) => item.checkId === 'new-dependency'),
  ).toBe(false);
});

it('rejects corrupted snapshots without replacing them', async () => {
  const root = await copyFixture();
  await put(root, '.overseer/snapshots/broken.json', '{broken');
  await expect(listSnapshots(root)).rejects.toThrow('not overwritten');
  expect(await readFile(path.join(root, '.overseer/snapshots/broken.json'), 'utf8')).toBe(
    '{broken',
  );
});

it('reads Git commits without changing the index or uncommitted files', async () => {
  const root = await copyFixture();
  await git(root, ['init']);
  await git(root, ['add', '.']);
  await git(root, [
    '-c',
    'user.name=Overseer Test',
    '-c',
    'user.email=test@example.invalid',
    'commit',
    '-m',
    'baseline',
  ]);
  const original = await readFile(path.join(root, 'app/page.tsx'), 'utf8');
  await put(root, 'app/page.tsx', original + '\n// Local uncommitted edit\n');
  const status = await git(root, ['status', '--porcelain']);
  const atRef = await modelAtRef(root, 'HEAD');
  const current = await analyzeProject(root);
  expect(compareModels(atRef, current).files.changed).toContain('app/page.tsx');
  expect(await git(root, ['status', '--porcelain'])).toBe(status);
  expect(await readFile(path.join(root, 'app/page.tsx'), 'utf8')).toContain(
    'Local uncommitted edit',
  );
  await expect(modelAtRef(root, '--invalid')).rejects.toThrow('Git reference');
});

it('compares a project inside a larger Git repository', async () => {
  const root = await copyFixture();
  const nested = path.join(root, 'apps/site');
  await cp(fixture('good'), nested, { recursive: true });
  await git(root, ['init']);
  await git(root, ['add', '.']);
  await git(root, [
    '-c',
    'user.name=Overseer Test',
    '-c',
    'user.email=test@example.invalid',
    'commit',
    '-m',
    'nested baseline',
  ]);
  const model = await modelAtRef(nested, 'HEAD');
  expect(model.pages.map((page) => page.route).sort()).toEqual(['/', '/results']);
  expect(model.files.some((file) => file.path.startsWith('apps/'))).toBe(false);
});
