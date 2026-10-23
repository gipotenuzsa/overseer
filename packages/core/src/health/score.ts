import type { Finding } from '../model.js';
export function healthScore(findings: Finding[]): number {
  return Math.max(
    0,
    100 -
      findings.reduce(
        (sum, finding) => sum + { critical: 15, warning: 5, info: 1 }[finding.level],
        0,
      ),
  );
}
