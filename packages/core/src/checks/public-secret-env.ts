import { finding } from './shared.js';
import type { Check } from './shared.js';

export const check: Check = {
  id: 'public-secret-env',
  level: 'critical',
  title: 'A secret variable is public',
  whyDangerous: 'Next.js can include NEXT_PUBLIC variables in browser code.',
  fixPrompt:
    'Remove NEXT_PUBLIC from this secret variable and read it only on the server. Rotate the value if it was deployed.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const [file, facts] of context.facts)
      for (const env of facts.env)
        if (
          /^NEXT_PUBLIC_.*(?:SECRET|SERVICE|PRIVATE|OPENAI.*KEY|STRIPE.*(?:KEY|TOKEN))/i.test(
            env.name,
          ) &&
          !/STRIPE.*PUBLISHABLE/i.test(env.name)
        )
          result.push(
            finding(
              check,
              file,
              env.line,
              'A public environment variable has a secret-related name.',
            ),
          );
    return result;
  },
};
