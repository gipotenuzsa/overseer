import { expect, it } from 'vitest';
import { analyzeProject, compareModels } from '@overseer/core';
import { renderReport } from '../src/report.js';
import { fixture } from '../../core/test/helpers.js';

it('escapes project-controlled HTML in standalone reports', async () => {
  const model = await analyzeProject(fixture('good'));
  const report = compareModels(undefined, model);
  report.files.added.push('<script>alert("x")</script>');
  const html = renderReport(report);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('Content-Security-Policy');
});
