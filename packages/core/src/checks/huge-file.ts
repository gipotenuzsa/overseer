import { finding } from './shared.js';
import type { Check } from './shared.js';

export const check: Check = {
  id: 'huge-file',
  level: 'warning',
  title: 'A file is hard to review',
  whyDangerous: 'A large file can hide unrelated behavior and make changes harder to check.',
  fixPrompt:
    'Split this file into small modules with clear responsibilities while preserving behavior and tests.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const file of context.model.files)
      if (context.facts.has(file.path) && file.lines > context.config.hugeFileLines)
        result.push(
          finding(
            check,
            file.path,
            1,
            `This file has ${file.lines} lines; your limit is ${context.config.hugeFileLines}.`,
          ),
        );
    return result;
  },
};
