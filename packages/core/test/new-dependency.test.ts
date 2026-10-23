import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('new-dependency finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('new-dependency');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'new-dependency',
      level: 'info',
      file: 'package.json',
      line: 1,
    }),
  );
});
