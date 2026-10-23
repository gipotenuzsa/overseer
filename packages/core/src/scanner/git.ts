import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { slash } from './files.js';

const exec = promisify(execFile);
export async function git(root: string, args: string[]): Promise<string> {
  const result = await exec('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 20_000_000,
    timeout: 15000,
    windowsHide: true,
  });
  return result.stdout;
}
export async function gitInfo(root: string): Promise<{ commit?: string; tracked: Set<string> }> {
  try {
    const gitRoot = (await git(root, ['rev-parse', '--show-toplevel'])).trim();
    const prefix = slash(path.relative(await realpath(gitRoot), await realpath(root)));
    const names = (await git(root, ['ls-files', '--full-name', '-z', '--', '.'])).split('\0');
    const tracked = new Set(
      names
        .filter(Boolean)
        .filter((file) => !prefix || file.startsWith(`${prefix}/`))
        .map((file) => (prefix ? file.slice(prefix.length + 1) : file)),
    );
    let commit: string | undefined;
    try {
      commit = (await git(root, ['rev-parse', '--verify', 'HEAD'])).trim();
    } catch {
      /* A new repository has no commits yet. */
    }
    return { tracked, ...(commit ? { commit } : {}) };
  } catch {
    return { tracked: new Set() };
  }
}
