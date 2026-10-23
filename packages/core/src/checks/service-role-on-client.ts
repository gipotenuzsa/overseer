import { finding } from './shared.js';
import type { Check } from './shared.js';

export const check: Check = {
  id: 'service-role-on-client',
  level: 'critical',
  title: 'An admin key can reach the browser',
  whyDangerous: 'A Supabase service role key can bypass row access rules.',
  fixPrompt:
    'Move the service role key and its imports to server-only code. Use the public anon key and RLS in the browser.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const [file, facts] of context.facts) {
      const client = context.model.files.find((item) => item.path === file)?.isClient;
      for (const env of facts.env)
        if (
          /SUPABASE.*SERVICE_ROLE/i.test(env.name) &&
          (client || env.name.startsWith('NEXT_PUBLIC_'))
        )
          result.push(
            finding(
              check,
              file,
              env.line,
              'A service role environment variable is used in browser-reachable code.',
            ),
          );
    }
    return result;
  },
};
