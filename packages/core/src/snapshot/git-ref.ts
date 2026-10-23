import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { git } from '../scanner/git.js';
import { isEnv, slash } from '../scanner/files.js';
import { scanContext } from '../scanner/scan.js';
import { analyzeContext } from '../analyze.js';
import type { ProjectModel } from '../model.js';

export async function modelAtRef(root: string, ref: string): Promise<ProjectModel> {
  let commit: string;
  let prefix: string;
  try {
    commit = (
      await git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])
    ).trim();
    const gitRoot = (await git(root, ['rev-parse', '--show-toplevel'])).trim();
    prefix = slash(path.relative(await realpath(gitRoot), await realpath(root)));
  } catch {
    throw new Error(
      'The Git reference cannot be read. Use a valid local commit or tag in a Git project.',
    );
  }
  const entries = (
    await git(root, ['ls-tree', '--full-tree', '-r', '-l', '-z', commit, '--', prefix || '.'])
  )
    .split('\0')
    .filter(Boolean);
  if (entries.length > 30000) throw new Error('This Git tree exceeds the 30,000 file limit.');
  const temporary = await mkdtemp(path.join(tmpdir(), 'overseer-ref-'));
  if (
    path.dirname(temporary) !== path.resolve(tmpdir()) ||
    !path.basename(temporary).startsWith('overseer-ref-')
  )
    throw new Error('Unexpected Git comparison cleanup path.');
  const tracked = new Set<string>();
  let total = 0;
  try {
    for (const entry of entries) {
      const match = /^(\d+) blob ([a-f0-9]+)\s+(\d+)\t(.+)$/.exec(entry);
      if (!match || match[1] === '120000') continue;
      let file = match[4]!;
      if (prefix) {
        if (!file.startsWith(prefix + '/')) continue;
        file = file.slice(prefix.length + 1);
      }
      if (
        file
          .split('/')
          .some((part) =>
            ['..', '.git', 'node_modules', '.next', 'dist', 'build', 'coverage'].includes(part),
          ) ||
        path.isAbsolute(file) ||
        file.includes('\\')
      )
        continue;
      if (
        file.startsWith('.overseer/') &&
        !['.overseer/config.json', '.overseer/rules.md'].includes(file)
      )
        continue;
      tracked.add(file);
      if (
        !/\.(?:[cm]?[jt]sx?|sql|json)$/.test(file) &&
        path.posix.basename(file) !== '.gitignore' &&
        !isEnv(file)
      )
        continue;
      if (Number(match[3]) > 2_000_000) continue;
      total += Number(match[3]);
      if (total > 50_000_000) throw new Error('This Git tree exceeds the 50 MB text limit.');
      const content = isEnv(file) ? '' : await git(root, ['cat-file', 'blob', match[2]!]);
      if (content.includes('\0')) continue;
      await mkdir(path.dirname(path.join(temporary, file)), { recursive: true });
      await writeFile(path.join(temporary, file), content);
    }
    const context = await scanContext(temporary);
    context.tracked = tracked;
    context.model.gitCommit = commit;
    return await analyzeContext(context);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
