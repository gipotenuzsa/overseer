import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('secret-in-code finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('secret-in-code');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'secret-in-code',
      level: 'critical',
      file: 'lib/admin.ts',
      line: 4,
    }),
  );
});
