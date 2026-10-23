import color from 'picocolors';
import type { ProjectModel } from '@overseer/core';

export function formatScan(model: ProjectModel): string {
  const lines = [
    color.bold(`Project health: ${model.health}/100`),
    `${model.features.length} features · ${model.pages.length} pages · ${model.apis.length} APIs · ${model.tables.length} tables`,
    '',
  ];
  for (const feature of model.features)
    lines.push(`${color.cyan(feature.name)} (${feature.entry}) — ${feature.files.length} files`);
  lines.push(
    '',
    `${model.findings.length} findings from known patterns. This is not a security guarantee.`,
  );
  for (const item of model.findings) {
    const level =
      item.level === 'critical'
        ? color.red(item.level)
        : item.level === 'warning'
          ? color.yellow(item.level)
          : item.level;
    lines.push(
      '',
      `${level.toUpperCase()}: ${item.title} — ${item.file}:${item.line ?? 1}`,
      item.message,
      item.whyDangerous,
      `Ask your agent: ${item.fixPrompt}`,
    );
  }
  for (const item of model.diagnostics)
    lines.push(color.yellow(`Analysis limit: ${item.file}: ${item.message}`));
  return lines.join('\n');
}
