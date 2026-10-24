import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, realpath, rm, writeFile, mkdir, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest: unknown = JSON.parse(
  await readFile(path.join(root, 'packages/cli/package.json'), 'utf8'),
);
assert(
  manifest &&
    typeof manifest === 'object' &&
    'version' in manifest &&
    typeof manifest.version === 'string',
);
const tarball = path.join(root, 'artifacts', `overseer-cli-${manifest.version}.tgz`);
await access(tarball);
const nodeDirectory = path.dirname(await realpath(process.execPath));
const candidates = [
  path.join(nodeDirectory, 'node_modules/npm/bin/npm-cli.js'),
  path.resolve(nodeDirectory, '../lib/node_modules/npm/bin/npm-cli.js'),
  ...(process.env.npm_execpath?.endsWith('npm-cli.js') ? [process.env.npm_execpath] : []),
];
let npm: string | undefined;
for (const candidate of candidates) {
  try {
    await access(candidate);
    npm = candidate;
    break;
  } catch {
    /* Try the next Node installation layout. */
  }
}
assert(npm, 'Install npm beside Node.js before running the package smoke test.');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'overseer-package-'));
if (
  path.dirname(path.resolve(temporary)) !== path.resolve(os.tmpdir()) ||
  !path.basename(temporary).startsWith('overseer-package-')
)
  throw new Error('Invalid temporary path.');
const cache = path.join(temporary, 'npm-cache');
function run(args: string[], cwd = temporary, expected = 0): string {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 5_000_000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result.stdout;
}
try {
  await writeFile(path.join(temporary, 'package.json'), '{"private":true}\n');
  run([npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache, tarball]);
  const cli = path.join(temporary, 'node_modules/overseer-cli/dist/index.js');
  assert.equal(run([cli, '--version']).trim(), manifest.version);
  assert(run([cli, '--help']).includes('scan'));
  const project = path.join(temporary, 'clean project');
  await cp(path.join(root, 'fixtures/good-next-app'), project, {
    recursive: true,
    filter: (file) => !file.split(path.sep).includes('.overseer'),
  });
  const result: unknown = JSON.parse(run([cli, 'scan', '--json'], project));
  assert(result && typeof result === 'object' && 'health' in result && result.health === 100);
  run([cli, 'check'], project);
  assert(run([cli, 'diff'], project).includes('0 new findings'));
  run([cli, 'sync'], project);
  assert(run([cli, 'sync'], project).includes('AGENTS.md: unchanged'));
  const bad = path.join(temporary, 'bad project');
  await cp(path.join(root, 'fixtures/bad-next-app'), bad, {
    recursive: true,
    filter: (file) => !file.split(path.sep).includes('.overseer'),
  });
  run([cli, 'check'], bad, 1);

  // Exercise the npm-installed executable, not a workspace module.
  const child = spawn(process.execPath, [cli, '--no-open', '--port', '0'], {
    cwd: project,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    errors += chunk;
  });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Packaged UI startup timed out.')), 30_000);
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', () => {
        clearTimeout(timeout);
        reject(new Error(`Packaged UI exited: ${errors}`));
      });
      child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
        output += chunk;
        const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });
    });
    const html = await (await fetch(url)).text();
    assert(html.includes('<div id="root">'));
    const asset = /src="([^"]+\.js)"/.exec(html)?.[1];
    assert(asset, 'Built browser bundle must be in the tarball.');
    const javascript = await fetch(new URL(asset, url));
    assert.equal(javascript.status, 200);
    assert((await javascript.text()).length > 1000);
    const data: unknown = await (await fetch(`${url}/api/data`)).json();
    assert(data && typeof data === 'object' && 'model' in data);
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
      child.kill('SIGTERM');
      await exited;
    }
  }
  // Resolve the tarball with npm exec from a folder with no local installation.
  const empty = path.join(temporary, 'empty');
  await mkdir(empty);
  assert(
    run(
      [
        npm,
        'exec',
        '--yes',
        '--cache',
        cache,
        `--package=${tarball}`,
        '--',
        'overseer',
        '--version',
      ],
      empty,
    ).includes(manifest.version),
  );
  console.log(
    'Clean npm install and npm exec passed: version, help, scan, check, diff, sync, UI and assets.',
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
