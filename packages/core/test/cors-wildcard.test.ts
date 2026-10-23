import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('cors-wildcard finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('cors-wildcard');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'cors-wildcard',
      level: 'warning',
      file: 'app/api/results/route.ts',
      line: 6,
    }),
  );
});
