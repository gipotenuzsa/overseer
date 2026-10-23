import { finding } from './shared.js';
import type { Check } from './shared.js';
import { implicitEntry } from './shared.js';

export const check: Check = {
  id: 'unused-file',
  level: 'info',
  title: 'A file may no longer be used',
  whyDangerous:
    'An unreferenced file can confuse future edits. Framework or dynamic loading can be invisible to this check.',
  fixPrompt:
    'Check whether this file has an external or dynamic entry point. Remove it only after confirming it is unused.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    if (context.model.diagnostics.length) return result;
    const imported = new Set(context.model.imports.map(([, to]) => to));
    for (const file of context.facts.keys())
      if (!imported.has(file) && !implicitEntry(file))
        result.push(finding(check, file, 1, 'No static local import points to this file.'));
    return result;
  },
};
