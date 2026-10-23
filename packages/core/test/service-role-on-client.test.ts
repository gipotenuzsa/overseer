import { it, expect } from 'vitest';
import { checkFixtures } from './check-fixtures.js';
it('service-role-on-client finds the bad example and accepts the good fixture', async () => {
  const { good, bad } = await checkFixtures('service-role-on-client');
  expect(good).toEqual([]);
  expect(bad).toContainEqual(
    expect.objectContaining({
      checkId: 'service-role-on-client',
      level: 'critical',
      file: 'lib/admin.ts',
      line: 2,
    }),
  );
});
