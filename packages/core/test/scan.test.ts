import { describe, expect, it } from 'vitest';
import { symlink } from 'node:fs/promises';
import path from 'node:path';
import { scanContext, scanProject } from '../src/scanner/scan.js';
import { analyzeSource } from '../src/analyzers/source.js';
import { analyzeSql } from '../src/analyzers/sql.js';
import { routeFor } from '../src/analyzers/imports.js';
import { git } from '../src/scanner/git.js';
import { copyFixture, fixture, put } from './helpers.js';

describe('project models', () => {
  for (const kind of ['good', 'bad'] as const)
    it(`extracts the ${kind} fixture`, async () => {
      const model = await scanProject(fixture(kind));
      expect(model.pages.map((page) => page.route).sort()).toEqual(['/', '/results']);
      expect(model.apis.find((api) => api.route === '/api/results')?.methods).toEqual(['POST']);
      expect(model.tables).toEqual([
        { name: 'results', rls: kind === 'good', usedIn: ['app/api/results/route.ts'] },
      ]);
      expect(model.imports).toContainEqual([
        'app/(workspace)/results/page.tsx',
        'components/Results.tsx',
      ]);
      expect(model.dependencies.next).toBe('16.4.0');
      expect(model.envVars.find((env) => env.name === 'NEXT_PUBLIC_SUPABASE_URL')?.public).toBe(
        true,
      );
      expect(model.diagnostics).toEqual([]);
      expect(JSON.stringify(model)).not.toContain('sk_live_');
      if (kind === 'bad')
        expect(model.files.find((file) => file.path === 'lib/admin.ts')?.isClient).toBe(true);
    });

  it('respects nested ignore rules, re-inclusion, configured ignores, and build exclusions', async () => {
    const root = await copyFixture();
    await put(root, 'lib/.gitignore', 'hidden.ts\n*.json\n!keep.json\n');
    for (const file of [
      'lib/hidden.ts',
      'lib/ignored.json',
      'lib/keep.json',
      '.next/cache.ts',
      'skip.ts',
    ])
      await put(root, file, '{}');
    await put(root, '.overseer/config.json', JSON.stringify({ ignore: ['skip.ts'] }));
    const paths = (await scanProject(root)).files.map((file) => file.path);
    expect(paths).toContain('lib/keep.json');
    for (const file of ['lib/hidden.ts', 'lib/ignored.json', '.next/cache.ts', 'skip.ts'])
      expect(paths).not.toContain(file);
  });

  it('never reads env values and handles tracked files relative to a nested project', async () => {
    const root = await copyFixture();
    await git(root, ['init']);
    await put(root, '.env', 'DO_NOT_READ=private-value');
    await git(root, ['add', '-f', '.env']);
    const context = await scanContext(root);
    expect(context.tracked.has('.env')).toBe(true);
    expect(context.envFiles).toContainEqual({ file: '.env', ignored: true });
    expect(context.sources.has('.env')).toBe(false);
    expect(JSON.stringify(context.model)).not.toContain('private-value');
  });

  it('skips directory symlinks and oversized files with a diagnostic', async () => {
    const root = await copyFixture();
    await put(root, 'large.ts', 'x'.repeat(2_000_001));
    await symlink(
      path.join(root, 'lib'),
      path.join(root, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const model = await scanProject(root);
    expect(model.files.some((file) => file.path.startsWith('linked/'))).toBe(false);
    expect(model.diagnostics).toContainEqual({
      file: 'large.ts',
      message: expect.stringContaining('skipped'),
    });
  });

  it('reports parse failures without leaking source and keeps unknown RLS distinct', async () => {
    const root = await copyFixture();
    await put(root, 'lib/broken.ts', "const token = 'private-value'; export const = ;");
    await put(root, 'lib/unknown.ts', "db.from('external').select('*');");
    const model = await scanProject(root);
    expect(model.diagnostics[0]?.file).toBe('lib/broken.ts');
    expect(model.tables.find((table) => table.name === 'external')?.rls).toBeNull();
    expect(JSON.stringify(model)).not.toContain('private-value');
  });

  it('rejects unsupported projects and invalid config', async () => {
    const root = await copyFixture();
    await put(root, 'package.json', '{}');
    await expect(scanProject(root)).rejects.toThrow('Next.js App Router');
    await put(root, '.overseer/config.json', '{"hugeFileLines": -1}');
    await expect(scanProject(root)).rejects.toThrow('config.json');
  });
});

describe('source and SQL edge cases', () => {
  it('uses syntax instead of comments or inert strings', () => {
    const facts = analyzeSource(
      `// eval('bad')\nconst text = "process.env.NEXT_PUBLIC_SECRET";\nexport { handler as POST };\nfunction handler() {}\nconst { NEXT_PUBLIC_URL } = process.env;\nimport('./part');`,
    );
    expect(facts.dangerous).toEqual([]);
    expect(facts.env.map((env) => env.name)).toEqual(['NEXT_PUBLIC_URL']);
    expect(facts.methods.map((method) => method.name)).toEqual(['POST']);
    expect(facts.imports).toEqual(['./part']);
  });
  it('applies ordered migrations and ignores comments and SQL bodies', () => {
    const tables = analyzeSql(
      new Map([
        [
          'supabase/migrations/001.sql',
          'create table public.notes(id int); alter table notes enable row level security;',
        ],
        [
          'supabase/migrations/002.sql',
          '-- create table fake(id int);\nalter table public.notes disable row level security; create table archive.logs(id int); alter table archive.logs enable row level security; DO $$ BEGIN CREATE TABLE hidden(id int); END $$;',
        ],
      ]),
    );
    expect(tables.map((table) => [table.name, table.rls])).toEqual([
      ['notes', false],
      ['archive.logs', true],
    ]);
  });
  it('normalizes Windows paths, groups, slots, and dynamic routes', () => {
    expect(routeFor('src\\app\\(site)\\@main\\posts\\[id]\\page.tsx')).toBe('/posts/[id]');
    expect(routeFor('lib/page.tsx')).toBeUndefined();
  });
});
