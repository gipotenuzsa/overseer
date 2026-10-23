import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('huge-file finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('huge-file');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'huge-file',
      level: 'warning',
      file: 'lib/long.ts',
      line: 1,
    }),
  );
});
