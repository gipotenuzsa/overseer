import type { ProjectModel } from './model.js';
import { scanContext } from './scanner/scan.js';
import { groupFeatures } from './features/group.js';
import { healthScore } from './health/score.js';
import { checks } from './checks/index.js';

export async function analyzeProject(root: string, baseline?: ProjectModel): Promise<ProjectModel> {
  const context = await scanContext(root);
  const { model, config } = context;
  model.features = groupFeatures(context);
  for (const check of checks) {
    if (config.disabledChecks.includes(check.id)) continue;
    const findings = await check.run(context, baseline);
    model.findings.push(
      ...findings.filter(
        (finding) =>
          !config.suppressions.some(
            (item) =>
              item.checkId === finding.checkId &&
              item.file === finding.file &&
              (item.line === undefined || item.line === finding.line),
          ),
      ),
    );
  }
  model.findings = [
    ...new Map(model.findings.map((finding) => [finding.id, finding])).values(),
  ].sort(
    (a, b) =>
      a.file.localeCompare(b.file, 'en') ||
      (a.line ?? 1) - (b.line ?? 1) ||
      a.checkId.localeCompare(b.checkId, 'en'),
  );
  for (const finding of model.findings) {
    const feature = model.features.find((item) => item.files.includes(finding.file));
    if (feature) finding.featureId = feature.id;
  }
  model.health = healthScore(model.findings);
  return model;
}
