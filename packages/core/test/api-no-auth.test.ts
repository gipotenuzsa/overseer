import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('api-no-auth finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('api-no-auth');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'api-no-auth',
      level: 'warning',
      file: 'app/api/results/route.ts',
      line: 2,
    }),
  );
});
