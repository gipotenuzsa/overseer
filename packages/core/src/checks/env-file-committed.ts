import { finding } from './shared.js';
import type { Check } from './shared.js';
import { isEnv } from '../scanner/files.js';

export const check: Check = {
  id: 'env-file-committed',
  level: 'critical',
  title: 'An environment file is exposed',
  whyDangerous:
    'Environment files often contain private keys. Git can preserve them even after deletion.',
  fixPrompt:
    'Remove this environment file from Git tracking, add an ignore rule, and rotate any keys it contained. Keep only an empty .env.example.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    const files = new Set([
      ...context.envFiles.map((item) => item.file),
      ...[...context.tracked].filter(isEnv),
    ]);
    for (const file of files) {
      const tracked = context.tracked.has(file);
      const env = context.envFiles.find((item) => item.file === file);
      if (tracked || (env && !env.ignored))
        result.push(
          finding(
            check,
            file,
            1,
            tracked
              ? 'This environment file is tracked by Git.'
              : 'This environment file has no ignore protection. It is not confirmed as committed.',
          ),
        );
    }
    return result;
  },
};
