import { cp, mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach } from 'vitest';

export const fixture = (kind: 'good' | 'bad'): string =>
  fileURLToPath(new URL(`../../../fixtures/${kind}-next-app/`, import.meta.url));
const roots: string[] = [];
export async function copyFixture(kind: 'good' | 'bad' = 'good'): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'overseer-test-'));
  roots.push(root);
  await cp(fixture(kind), root, { recursive: true });
  return root;
}
export async function put(root: string, file: string, content: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), content);
}
afterEach(async () => {
  for (const root of roots.splice(0)) {
    if (
      path.dirname(root) !== path.resolve(tmpdir()) ||
      !path.basename(root).startsWith('overseer-test-')
    )
      throw new Error('Unexpected test cleanup path.');
    await rm(root, { recursive: true, force: true });
  }
});
