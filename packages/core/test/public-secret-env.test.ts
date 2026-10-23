import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('public-secret-env finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('public-secret-env');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'public-secret-env',
      level: 'critical',
      file: 'lib/admin.ts',
      line: 3,
    }),
  );
});
