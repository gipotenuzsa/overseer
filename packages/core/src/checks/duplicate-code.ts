import { Detector, MemoryStore, getDefaultOptions, weak } from '@jscpd/core';
import type { IMapFrame } from '@jscpd/core';
import { Tokenizer, getFormatByFile } from '@jscpd/tokenizer';
import { finding } from './shared.js';
import type { Check } from './shared.js';

export const check: Check = {
  id: 'duplicate-code',
  level: 'info',
  title: 'A block of code is repeated',
  whyDangerous: 'Fixing one copy can leave another copy with old behavior.',
  fixPrompt:
    'Review both copies. If they serve the same purpose, extract a shared function and test its callers.',
  async run(context) {
    const result: ReturnType<typeof finding>[] = [];
    const store = new MemoryStore<IMapFrame>();
    const detector = new Detector(new Tokenizer(), store, undefined, {
      ...getDefaultOptions(),
      minLines: 15,
      minTokens: 70,
      mode: weak,
      silent: true,
    });
    try {
      for (const file of [...context.facts.keys()].sort()) {
        const format = getFormatByFile(file);
        if (!format) continue;
        const clones = await detector.detect(file, context.sources.get(file)!, format);
        for (const clone of clones) {
          const a = clone.duplicationA;
          const b = clone.duplicationB;
          if (a.sourceId === b.sourceId) continue;
          const current = a.sourceId === file ? a : b;
          const other = a.sourceId === file ? b : a;
          result.push(
            finding(
              check,
              current.sourceId,
              current.start.line,
              `A block of at least 15 lines also appears in ${other.sourceId}:${other.start.line}.`,
            ),
          );
        }
      }
    } finally {
      store.close();
    }
    return result;
  },
};
