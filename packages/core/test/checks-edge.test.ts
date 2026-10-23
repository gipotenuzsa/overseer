import { expect, it } from 'vitest';
import { analyzeProject } from '../src/analyze.js';
import { copyFixture, fixture, put } from './helpers.js';

it('keeps the clean fixture at 100 and traces API writes and shared layouts into a feature', async () => {
  const model = await analyzeProject(fixture('good'));
  expect(model.health).toBe(100);
  expect(model.findings).toEqual([]);
  const feature = model.features.find((item) => item.id === '/results');
  expect(feature?.files).toContain('app/layout.tsx');
  expect(feature?.files).toContain('app/api/results/route.ts');
  expect(feature?.tables).toEqual([{ name: 'results', access: 'write' }]);
});

it('applies disabled checks, suppressions, and custom line limits', async () => {
  const root = await copyFixture('bad');
  await put(
    root,
    '.overseer/config.json',
    JSON.stringify({
      disabledChecks: ['secret-in-code'],
      hugeFileLines: 500,
      suppressions: [{ checkId: 'public-secret-env', file: 'lib/admin.ts', line: 3 }],
    }),
  );
  const model = await analyzeProject(root);
  expect(
    model.findings.some((item) =>
      ['secret-in-code', 'huge-file', 'public-secret-env'].includes(item.checkId),
    ),
  ).toBe(false);
  expect(model.health).toBe(
    Math.max(
      0,
      100 -
        model.findings.reduce(
          (sum, item) => sum + { critical: 15, warning: 5, info: 1 }[item.level],
          0,
        ),
    ),
  );
});

it('avoids flagging imported wrappers, configured auth helpers, and intentionally public APIs', async () => {
  const root = await copyFixture();
  await put(
    root,
    'app/api/wrapped/route.ts',
    "import { withAuth } from '@/lib/auth'; export const POST = withAuth(async () => Response.json({ok:true}));",
  );
  await put(
    root,
    'lib/auth.ts',
    'export const withAuth = (handler: () => Promise<Response>) => handler; export function requireUser() {}',
  );
  await put(
    root,
    'app/api/custom/route.ts',
    "import { requireUser } from '@/lib/auth'; export async function POST() { requireUser(); return Response.json({ok:true}); }",
  );
  await put(
    root,
    'app/api/public/route.ts',
    'export async function POST() { return Response.json({ok:true}); }',
  );
  await put(
    root,
    '.overseer/config.json',
    JSON.stringify({ authHelpers: ['requireUser'], publicApiRoutes: ['/api/public'] }),
  );
  expect(
    (await analyzeProject(root)).findings.filter((item) => item.checkId === 'api-no-auth'),
  ).toEqual([]);
});

it('ignores comments, anonymous public keys, framework entries, and protected environment files', async () => {
  const root = await copyFixture();
  await put(
    root,
    'app/not-found.tsx',
    "// eval('bad'); dangerouslySetInnerHTML\nexport default function Missing() { return <p>Not found</p>; }",
  );
  await put(root, '.env', 'SECRET=synthetic');
  expect((await analyzeProject(root)).findings).toEqual([]);
});

it('reports an untracked environment file without claiming it was committed', async () => {
  const root = await copyFixture('bad');
  await put(root, '.env', 'SECRET=synthetic');
  const model = await analyzeProject(root);
  expect(model.findings.find((item) => item.checkId === 'env-file-committed')?.message).toContain(
    'not confirmed as committed',
  );
  expect(JSON.stringify(model)).not.toContain('sk_live_');
});
