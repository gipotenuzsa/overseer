import { analyzeProject } from '../src/analyze.js';
import { copyFixture, fixture, put } from './helpers.js';
import { git } from '../src/scanner/git.js';
export async function checkFixtures(checkId: string) {
  const goodModel = await analyzeProject(fixture('good'));
  const root = await copyFixture('bad');
  if (checkId === 'env-file-committed') {
    await git(root, ['init']);
    await put(root, '.env', 'PRIVATE_TOKEN=overseer-synthetic-value');
    await git(root, ['add', '.env']);
  }
  const badModel = await analyzeProject(root, checkId === 'new-dependency' ? goodModel : undefined);
  return {
    good: goodModel.findings.filter((f) => f.checkId === checkId),
    bad: badModel.findings.filter((f) => f.checkId === checkId),
  };
}
