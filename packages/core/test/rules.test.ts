import { expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { syncRules, mergeRules, startMarker, endMarker } from '../src/rules/sync.js';
import { analyzeProject } from '../src/analyze.js';
import { copyFixture, put } from './helpers.js';

it('preserves BOM, CRLF, and every byte outside an existing managed block', async () => {
  const root = await copyFixture();
  const prefix = '\uFEFF# Existing instructions\r\nDo not change these.\r\n';
  const suffix = '\r\n\r\nCustom trailing instructions';
  const original = prefix + startMarker + '\r\nold\r\n' + endMarker + suffix;
  await put(root, 'AGENTS.md', original);
  await put(root, 'CLAUDE.md', '# Claude notes\nKeep my notes.');
  await put(
    root,
    '.overseer/rules.md',
    '- Files must be no longer than 25 lines.\n- Use friendly button labels.\n',
  );
  const result = await syncRules(root);
  expect(result.forwarded).toEqual(['Use friendly button labels.']);
  const first = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  expect(first.slice(0, first.indexOf(startMarker))).toBe(prefix);
  expect(first.slice(first.indexOf(endMarker) + endMarker.length)).toBe(suffix);
  expect(first).toContain('npx overseer-cli diff');
  expect(
    (await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).startsWith(
      '# Claude notes\nKeep my notes.',
    ),
  ).toBe(true);
  expect((await syncRules(root)).files.every((file) => !file.changed)).toBe(true);
  expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(first);
});

it('validates both files before writing and rejects malformed markers or non-UTF-8 files', async () => {
  const root = await copyFixture();
  await put(root, 'AGENTS.md', 'Keep exactly this');
  await put(root, 'CLAUDE.md', startMarker);
  await expect(syncRules(root)).rejects.toThrow('markers');
  expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe('Keep exactly this');
  await writeFile(path.join(root, 'CLAUDE.md'), Buffer.from([0xff, 0xfe, 0x41, 0x00]));
  await expect(syncRules(root)).rejects.toThrow('UTF-8');
  expect(await readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe('Keep exactly this');
  expect(() => mergeRules(`${endMarker} x ${startMarker}`, 'rule')).toThrow('markers');
  expect(() => mergeRules(`${startMarker}${endMarker}${startMarker}${endMarker}`, 'rule')).toThrow(
    'markers',
  );
  expect(() => mergeRules('', startMarker)).toThrow('rules.md');
});

it('supports dry runs and creates missing agent/rules files only when requested', async () => {
  const root = await copyFixture();
  expect((await syncRules(root, true)).files.every((file) => file.changed)).toBe(true);
  await expect(readFile(path.join(root, 'AGENTS.md'))).rejects.toThrow();
  await syncRules(root);
  expect(await readFile(path.join(root, '.overseer/rules.md'), 'utf8')).toContain(
    'RLS on all tables',
  );
  expect((await syncRules(root)).files.every((file) => !file.changed)).toBe(true);
});

it('enforces supported constraints while forwarding unknown rules', async () => {
  const root = await copyFixture('bad');
  await put(
    root,
    '.overseer/config.json',
    JSON.stringify({ hugeFileLines: 500, disabledChecks: ['rls-disabled'] }),
  );
  await put(
    root,
    '.overseer/rules.md',
    '- Files must be no longer than 25 lines.\n- RLS on all tables.\n- Keep the interface friendly.\n',
  );
  const model = await analyzeProject(root);
  expect(model.findings.some((item) => item.checkId === 'huge-file')).toBe(true);
  expect(model.findings.some((item) => item.checkId === 'rls-disabled')).toBe(true);
  expect(model.findings.some((item) => item.message.includes('friendly'))).toBe(false);
});
