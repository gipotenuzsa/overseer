import { finding } from './shared.js';
import type { Check } from './shared.js';

export const check: Check = {
  id: 'rls-disabled',
  level: 'critical',
  title: 'A table has no row protection',
  whyDangerous:
    "Without row-level security, database access may expose or change other people's data.",
  fixPrompt:
    'Add a migration enabling RLS on this table and add narrow policies for each allowed operation. Test access with two different users.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const table of context.sqlTables)
      if (!table.rls)
        result.push(
          finding(
            check,
            table.file,
            table.line,
            `Table "${table.name}" is created without row-level security enabled in the scanned migrations.`,
          ),
        );
    return result;
  },
};
