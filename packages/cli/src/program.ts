import { Command } from 'commander';
import {
  analyzeProject,
  saveSnapshot,
  listSnapshots,
  modelAtRef,
  compareModels,
} from '@overseer/core';
import { formatScan } from './format.js';
import { formatDiff, saveReport } from './report.js';

export function createProgram(version: string): Command {
  const program = new Command()
    .name('overseer')
    .description('See what your AI coding agent actually built.')
    .version(version)
    .addHelpText(
      'after',
      '\nDevelopment preview: scan extracts local project facts.\n' +
        'Follow implementation progress in Project.md.',
    );

  program.action(() => {
    program.outputHelp();
  });

  program
    .command('scan')
    .description('Read a Next.js project and list its parts')
    .argument('[directory]', 'Project folder', '.')
    .option('--json', 'Print the project model as JSON')
    .action(async (directory: string, options: { json?: boolean }) => {
      const model = await analyzeProject(directory);
      await saveSnapshot(directory, model);
      const output = options.json ? JSON.stringify(model, null, 2) : formatScan(model);
      program.configureOutput().writeOut?.(output + '\n');
    });

  program
    .command('check')
    .description('Exit with code 1 when critical findings exist')
    .argument('[directory]', 'Project folder', '.')
    .option('--json', 'Print the project model as JSON')
    .action(async (directory: string, options: { json?: boolean }) => {
      const model = await analyzeProject(directory);
      await saveSnapshot(directory, model);
      program
        .configureOutput()
        .writeOut?.((options.json ? JSON.stringify(model, null, 2) : formatScan(model)) + '\n');
      if (model.findings.some((item) => item.level === 'critical')) process.exitCode = 1;
    });

  program
    .command('diff')
    .description('Explain changes since the last snapshot or a Git commit')
    .argument('[directory]', 'Project folder', '.')
    .option('--since <ref>', 'Compare with a local Git commit or tag')
    .option('--json', 'Print a JSON report')
    .action(async (directory: string, options: { since?: string; json?: boolean }) => {
      const baseline = options.since
        ? await modelAtRef(directory, options.since)
        : (await listSnapshots(directory)).at(-1)?.model;
      const model = await analyzeProject(directory, baseline);
      const report = compareModels(baseline, model);
      const reportFile = await saveReport(directory, report);
      await saveSnapshot(directory, model);
      program
        .configureOutput()
        .writeOut?.(
          (options.json
            ? JSON.stringify({ ...report, reportFile }, null, 2)
            : formatDiff(report) + `\n\nHTML report: ${reportFile}`) + '\n',
        );
    });

  return program;
}
