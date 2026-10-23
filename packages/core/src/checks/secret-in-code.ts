import { finding } from './shared.js';
import type { Check } from './shared.js';
import { looksSecret } from './shared.js';

export const check: Check = {
  id: 'secret-in-code',
  level: 'critical',
  title: 'A secret may be stored in code',
  whyDangerous: 'A copied key can give someone access to your account.',
  fixPrompt:
    'Move this key to a server-only environment variable and rotate it with its provider. Never repeat the key in your reply.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const [file, facts] of context.facts)
      for (const item of facts.strings)
        if (looksSecret(item.value, item.name))
          result.push(
            finding(
              check,
              file,
              item.line,
              'A secret-shaped value is written directly in this file. The value is hidden.',
            ),
          );
    return result;
  },
};
