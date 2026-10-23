import { finding } from './shared.js';
import type { Check } from './shared.js';
import { dependencyPurpose } from './shared.js';

export const check: Check = {
  id: 'new-dependency',
  level: 'info',
  title: 'A package was added',
  whyDangerous: 'A new package adds code and maintenance responsibilities to your project.',
  fixPrompt:
    'Explain why this dependency was added, review its license and maintenance, and remove it if it is unnecessary.',
  run(context, baseline) {
    const result: ReturnType<typeof finding>[] = [];
    if (!baseline) return result;
    for (const dependency of Object.keys(context.model.dependencies).sort())
      if (!Object.hasOwn(baseline.dependencies, dependency))
        result.push(
          finding(
            check,
            'package.json',
            1,
            `Added ${dependency}. ${dependencyPurpose(dependency)}`,
          ),
        );
    return result;
  },
};
