import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('unused-file finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('unused-file');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'unused-file',
      level: 'info',
      file: 'lib/unused.ts',
      line: 1,
    }),
  );
});
