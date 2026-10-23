import { finding } from './shared.js';
import type { Check } from './shared.js';
import { mutating } from './shared.js';

export const check: Check = {
  id: 'api-no-auth',
  level: 'warning',
  title: 'A write API has no visible user check',
  whyDangerous:
    'A visitor may be able to change data without permission. A custom access check may be outside this file.',
  fixPrompt:
    'Review this write handler and verify the user and their permission before changing data. Document intentionally public endpoints.',
  run(context) {
    const result: ReturnType<typeof finding>[] = [];
    for (const api of context.model.apis) {
      const facts = context.facts.get(api.file);
      if (
        !facts ||
        facts.wrapped ||
        context.config.publicApiRoutes.includes(api.route) ||
        !api.methods.some((method) => mutating.has(method))
      )
        continue;
      const authenticated = facts.calls.some(
        (call) =>
          /(?:^|\.)auth\.getUser$|(?:^|\.)getSession$|^auth$/.test(call.name) ||
          context.config.authHelpers.some((helper) => call.name === helper),
      );
      if (!authenticated)
        result.push(
          finding(
            check,
            api.file,
            facts.methods.find((method) => mutating.has(method.name))?.line ?? 1,
            'A write handler has no recognized authentication call.',
          ),
        );
    }
    return result;
  },
};
