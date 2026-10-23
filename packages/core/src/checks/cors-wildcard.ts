import { finding } from './shared.js';
import type { Check } from './shared.js';
import { mutating } from './shared.js';

export const check: Check = {
  id: 'cors-wildcard',
  level: 'warning',
  title: 'A write API allows every website',
  whyDangerous:
    'Other websites may be allowed to call this API from a browser. This does not replace authentication.',
  fixPrompt:
    'Restrict allowed origins for this write API to the websites that need access, and verify authorization.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const api of context.model.apis)
      if (api.methods.some((method) => mutating.has(method)))
        for (const line of context.facts.get(api.file)?.cors ?? [])
          result.push(
            finding(
              check,
              api.file,
              line,
              'This write API returns Access-Control-Allow-Origin: *.',
            ),
          );
    return result;
  },
};
