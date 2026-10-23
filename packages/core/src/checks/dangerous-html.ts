import { finding } from './shared.js';
import type { Check } from './shared.js';

export const check: Check = {
  id: 'dangerous-html',
  level: 'warning',
  title: 'Code inserts raw HTML or runs a string',
  whyDangerous: 'Untrusted input can execute script in the browser or on the server.',
  fixPrompt:
    'Remove string execution and render text normally. If HTML is required, sanitize it with a maintained allow-list sanitizer.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const [file, facts] of context.facts)
      for (const line of facts.dangerous)
        result.push(
          finding(
            check,
            file,
            line,
            'This code uses raw HTML or string execution. Review the origin of its input.',
          ),
        );
    return result;
  },
};
