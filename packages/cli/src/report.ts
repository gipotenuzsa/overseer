import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { managedDirectory, atomicWrite } from '@overseer/core';
import type { Changes, DiffReport } from '@overseer/core';

export function formatDiff(report: DiffReport): string {
  const lines = [
    `Session risk: ${report.risk.toUpperCase()}`,
    `Health: ${report.health.before} -> ${report.health.after}`,
    report.firstRun
      ? 'First snapshot: there is no earlier baseline.'
      : `Compared with ${report.baselineAt}`,
    '',
  ];
  for (const key of ['features', 'files', 'apis', 'tables', 'envVars', 'dependencies'] as const) {
    const group = report[key];
    lines.push(
      `${key}: ${group.added.length} added, ${group.changed.length} changed, ${group.removed.length} removed`,
    );
    for (const action of ['added', 'changed', 'removed'] as const)
      for (const item of group[action]) lines.push(`  ${action}: ${item}`);
  }
  lines.push(
    '',
    `${report.findings.added.length} new findings; ${report.findings.resolved.length} resolved findings.`,
  );
  for (const item of report.findings.added)
    lines.push(
      `NEW ${item.level}: ${item.title} (${item.file}:${item.line ?? 1})`,
      item.message,
      `Ask your agent: ${item.fixPrompt}`,
    );
  for (const item of report.findings.resolved)
    lines.push(`RESOLVED: ${item.title} (${item.file}:${item.line ?? 1})`);
  return lines.join('\n');
}
const escape = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
export function renderReport(report: DiffReport): string {
  function section(title: string, changes: Changes): string {
    const rows = (['added', 'changed', 'removed'] as const)
      .flatMap((action) =>
        changes[action].map((item) => `<li><strong>${action}</strong> ${escape(item)}</li>`),
      )
      .join('');
    return `<section><h2>${title}</h2>${rows ? `<ul>${rows}</ul>` : '<p>No changes.</p>'}</section>`;
  }
  const findings = (['added', 'resolved'] as const)
    .map(
      (state) =>
        `<section><h2>${state === 'added' ? 'New' : 'Resolved'} findings</h2>${report.findings[state].map((item) => `<article><h3>${escape(item.title)}</h3><p>${escape(item.level)} · ${escape(item.file)}:${item.line ?? 1}</p><p>${escape(item.message)}</p><p>${escape(item.whyDangerous)}</p><blockquote>${escape(item.fixPrompt)}</blockquote></article>`).join('') || '<p>None.</p>'}</section>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Overseer session report</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f4f6f2;color:#183127;max-width:900px;margin:40px auto;padding:0 24px}h1{font-size:42px;line-height:1.1}section{background:white;padding:24px;margin:20px 0;border:1px solid #d8e0d8;border-radius:16px}article+article{border-top:1px solid #ddd;padding-top:16px}blockquote{margin:16px 0;padding:16px;background:#eff4ed;border-left:3px solid #41785e;overflow-wrap:anywhere}li,p{overflow-wrap:anywhere}.score{font-size:28px}</style></head><body><header><p>OVERSEER / SESSION REPORT</p><h1>What changed in your project</h1><p class="score">Health ${report.health.before} → ${report.health.after} · ${report.risk.toUpperCase()} risk</p><p>${escape(report.createdAt)}${report.firstRun ? ' · First snapshot; no earlier baseline' : ''}</p><p>Known patterns only. This report is not a security guarantee.</p></header>${section('Features', report.features)}${section('Files', report.files)}${section('APIs', report.apis)}${section('Tables', report.tables)}${section('Environment names', report.envVars)}${section('Dependencies', report.dependencies)}${findings}<footer>Created locally by Overseer. No source code or secret values are included.</footer></body></html>`;
}
export async function saveReport(root: string, report: DiffReport): Promise<string> {
  const directory = await managedDirectory(root, 'reports');
  const file = path.join(directory, `${Date.now()}-${randomUUID().slice(0, 8)}.html`);
  await atomicWrite(file, renderReport(report));
  return file;
}
