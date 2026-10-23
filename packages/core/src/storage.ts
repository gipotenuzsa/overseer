import { lstat, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function managedDirectory(root: string, subdir?: string): Promise<string> {
  let directory = path.resolve(root);
  for (const segment of ['.overseer', ...(subdir ? [subdir] : [])]) {
    if (!/^[\w.-]+$/.test(segment)) throw new Error('Invalid storage directory.');
    directory = path.join(directory, segment);
    try {
      await mkdir(directory);
    } catch (error: unknown) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST')
        throw error;
    }
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error('Overseer storage must be a real directory, not a link.');
  }
  return directory;
}

export async function atomicWrite(file: string, content: string): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx', mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
