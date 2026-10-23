import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('env-file-committed finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('env-file-committed');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'env-file-committed',
      level: 'critical',
      file: '.env',
      line: 1,
    }),
  );
});
