import { chmod, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'artifacts');
const destination = path.join(artifacts, 'overseer-cli');

async function manifest(relative: string): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readFile(path.join(root, relative), 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid manifest.');
  return value as Record<string, unknown>;
}
function dependencies(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Missing dependencies.');
  const result: Record<string, string> = {};
  for (const [name, version] of Object.entries(value)) {
    if (typeof version !== 'string') throw new Error('Invalid dependency version.');
    if (name !== '@overseer/core') result[name] = version;
  }
  return result;
}

const cli = await manifest('packages/cli/package.json');
const core = await manifest('packages/core/package.json');
await mkdir(artifacts, { recursive: true });
if (path.dirname(path.resolve(destination)) !== path.resolve(artifacts))
  throw new Error('Invalid release path.');
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
for (const [from, to] of [
  ['packages/cli/dist', 'dist'],
  ['packages/core/dist', 'core'],
  ['packages/web/dist', 'web'],
  ['README.md', 'README.md'],
  ['LICENSE', 'LICENSE'],
  ['docs/USAGE.md', 'docs/USAGE.md'],
] as const)
  await cp(path.join(root, from), path.join(destination, to), { recursive: true });

// Keep the emitted core beside the CLI so installation needs no workspace packages.
for (const file of await readdir(path.join(destination, 'dist'))) {
  if (!file.endsWith('.js') && !file.endsWith('.d.ts')) continue;
  const target = path.join(destination, 'dist', file);
  const content = await readFile(target, 'utf8');
  await writeFile(
    target,
    content
      .replaceAll("'@overseer/core'", "'../core/index.js'")
      .replaceAll('"@overseer/core"', '"../core/index.js"'),
  );
}
await chmod(path.join(destination, 'dist/index.js'), 0o755);
await writeFile(
  path.join(destination, 'package.json'),
  JSON.stringify(
    {
      name: 'overseer-cli',
      version: cli.version,
      description: cli.description,
      type: 'module',
      license: 'MIT',
      bin: { overseer: './dist/index.js' },
      engines: cli.engines,
      files: ['dist', 'core', 'web', 'docs', 'README.md', 'LICENSE'],
      repository: { type: 'git', url: 'git+https://github.com/gipotenuzsa/overseer.git' },
      homepage: 'https://github.com/gipotenuzsa/overseer#readme',
      bugs: { url: 'https://github.com/gipotenuzsa/overseer/issues' },
      keywords: ['nextjs', 'supabase', 'ai', 'code-review', 'local-first'],
      publishConfig: { access: 'public' },
      dependencies: { ...dependencies(core.dependencies), ...dependencies(cli.dependencies) },
    },
    null,
    2,
  ) + '\n',
);
console.log(`Release files prepared in ${destination}`);
