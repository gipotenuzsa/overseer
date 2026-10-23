import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('rls-disabled finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('rls-disabled');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'rls-disabled',
      level: 'critical',
      file: 'supabase/migrations/001_results.sql',
      line: 1,
    }),
  );
});
