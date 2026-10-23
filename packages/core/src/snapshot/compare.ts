import type { ProjectModel, Finding } from '../model.js';
import { healthScore } from '../health/score.js';

export interface Changes {
  added: string[];
  removed: string[];
  changed: string[];
}
export interface DiffReport {
  createdAt: string;
  baselineAt: string | null;
  firstRun: boolean;
  health: { before: number; after: number };
  risk: 'low' | 'medium' | 'high';
  features: Changes;
  files: Changes;
  apis: Changes;
  tables: Changes;
  envVars: Changes;
  dependencies: Changes;
  findings: { added: Finding[]; resolved: Finding[] };
}
function changes(before: Record<string, string>, after: Record<string, string>): Changes {
  return {
    added: Object.keys(after)
      .filter((key) => !Object.hasOwn(before, key))
      .sort(),
    removed: Object.keys(before)
      .filter((key) => !Object.hasOwn(after, key))
      .sort(),
    changed: Object.keys(after)
      .filter((key) => Object.hasOwn(before, key) && before[key] !== after[key])
      .sort(),
  };
}
export function compareModels(before: ProjectModel | undefined, after: ProjectModel): DiffReport {
  const oldFindings = before?.findings.filter((item) => item.checkId !== 'new-dependency') ?? [];
  const oldIds = new Set(oldFindings.map((item) => item.id));
  const ids = new Set(after.findings.map((item) => item.id));
  const added = after.findings.filter((item) => !oldIds.has(item.id));
  const files = changes(
    Object.fromEntries(before?.files.map((file) => [file.path, file.hash]) ?? []),
    Object.fromEntries(after.files.map((file) => [file.path, file.hash])),
  );
  const features = changes(
    Object.fromEntries(
      before?.features.map((feature) => [feature.id, JSON.stringify(feature)]) ?? [],
    ),
    Object.fromEntries(after.features.map((feature) => [feature.id, JSON.stringify(feature)])),
  );
  for (const feature of after.features)
    if (
      !features.added.includes(feature.id) &&
      !features.changed.includes(feature.id) &&
      feature.files.some((file) => files.changed.includes(file))
    )
      features.changed.push(feature.id);
  return {
    createdAt: after.createdAt,
    baselineAt: before?.createdAt ?? null,
    firstRun: !before,
    health: { before: healthScore(oldFindings), after: after.health },
    risk: added.some((item) => item.level === 'critical')
      ? 'high'
      : added.some((item) => item.level === 'warning') ||
          files.changed.length ||
          files.removed.length
        ? 'medium'
        : 'low',
    files,
    features,
    apis: changes(
      Object.fromEntries(before?.apis.map((api) => [api.route, api.methods.join(',')]) ?? []),
      Object.fromEntries(after.apis.map((api) => [api.route, api.methods.join(',')])),
    ),
    tables: changes(
      Object.fromEntries(before?.tables.map((table) => [table.name, String(table.rls)]) ?? []),
      Object.fromEntries(after.tables.map((table) => [table.name, String(table.rls)])),
    ),
    envVars: changes(
      Object.fromEntries(before?.envVars.map((env) => [env.name, String(env.public)]) ?? []),
      Object.fromEntries(after.envVars.map((env) => [env.name, String(env.public)])),
    ),
    dependencies: changes(before?.dependencies ?? {}, after.dependencies),
    findings: { added, resolved: oldFindings.filter((item) => !ids.has(item.id)) },
  };
}
