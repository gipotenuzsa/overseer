import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('duplicate-code finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('duplicate-code');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({ checkId: 'duplicate-code', level: 'info', file: 'lib/second.ts' }),
  );
});
