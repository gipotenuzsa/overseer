import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('dangerous-html finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('dangerous-html');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'dangerous-html',
      level: 'warning',
      file: 'components/Results.tsx',
      line: 10,
    }),
  );
});
