import { lstat, open, readdir } from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';
import type { Ignore } from 'ignore';

export const slash = (value: string): string => value.replaceAll('\\', '/');
export const isEnv = (file: string): boolean =>
  /^\.env(?:\..*)?$/.test(path.posix.basename(file)) &&
  path.posix.basename(file) !== '.env.example';

export async function readText(file: string, limit = 2_000_000): Promise<string> {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Expected a regular local file.');
  const handle = await open(file, 'r');
  try {
    const buffer = Buffer.alloc(Math.min(stat.size + 1, limit + 1));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > limit) throw new Error('File exceeds the read limit.');
    const text = buffer.subarray(0, bytesRead).toString('utf8');
    if (text.includes('\0')) throw new Error('Binary files are not analyzed.');
    return text;
  } finally {
    await handle.close();
  }
}

export async function optionalText(file: string, limit?: number): Promise<string | undefined> {
  try {
    return await readText(file, limit);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return undefined;
    throw error;
  }
}

interface IgnoreScope {
  dir: string;
  rules: Ignore;
}
export interface Discovery {
  sources: Map<string, string>;
  envFiles: { file: string; ignored: boolean }[];
  diagnostics: { file: string; message: string }[];
}

export async function discover(root: string, patterns: string[]): Promise<Discovery> {
  const result: Discovery = { sources: new Map(), envFiles: [], diagnostics: [] };
  const excluded = new Set([
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'coverage',
    '.overseer',
    '.vercel',
    '.turbo',
  ]);
  const custom = ignore().add(patterns);
  let visited = 0;
  let total = 0;
  async function walk(dir: string, parents: IgnoreScope[]): Promise<void> {
    const ignoreText = await optionalText(path.join(root, dir, '.gitignore'), 100_000);
    const scopes =
      ignoreText === undefined ? parents : [...parents, { dir, rules: ignore().add(ignoreText) }];
    const entries = await readdir(path.join(root, dir), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (++visited > 30000)
        throw new Error(
          'This project exceeds the 30,000 entry limit. Add folders to config.ignore.',
        );
      const file = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || excluded.has(entry.name)) continue;
      const target = file + (entry.isDirectory() ? '/' : '');
      let ignored = false;
      for (const scope of scopes) {
        const decision = scope.rules.test(scope.dir ? target.slice(scope.dir.length + 1) : target);
        if (decision.ignored) ignored = true;
        if (decision.unignored) ignored = false;
      }
      ignored ||= custom.ignores(target);
      if (isEnv(file)) {
        result.envFiles.push({ file, ignored });
        continue;
      }
      if (ignored) continue;
      if (entry.isDirectory()) {
        await walk(file, scopes);
        continue;
      }
      if (!entry.isFile() || !/\.(?:[cm]?[jt]sx?|sql|json)$/.test(file)) continue;
      if (/^(?:package-lock|pnpm-lock|yarn\.lock)/.test(entry.name)) continue;
      try {
        const content = await readText(path.join(root, file));
        total += Buffer.byteLength(content);
        if (total > 50_000_000)
          throw new Error('Project text exceeds 50 MB. Add folders to config.ignore.');
        result.sources.set(file, content);
      } catch (error: unknown) {
        if (total > 50_000_000) throw error;
        result.diagnostics.push({
          file,
          message: 'File could not be read as bounded text; it was skipped.',
        });
      }
    }
  }
  await walk('', []);
  return result;
}
