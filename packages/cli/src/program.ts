import { Command, InvalidArgumentError } from 'commander';
import open from 'open';
import { startServer } from './server.js';
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

  const parsePort = (value: string): number => {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65535)
      throw new InvalidArgumentError('Use a port from 0 to 65535.');
    return port;
  };
  async function showUI(
    directory: string,
    options: { open?: boolean; port?: number },
  ): Promise<void> {
    const running = await startServer(
      directory,
      options.port === undefined ? {} : { port: options.port },
    );
    program
      .configureOutput()
      .writeOut?.(`Overseer is ready at ${running.url}\nPress Ctrl+C to stop.\n`);
    const stop = (): void => {
      void running.close();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    if (options.open !== false)
      await open(running.url).catch(() => {
        program.configureOutput().writeErr?.('Open the local address above in your browser.\n');
      });
  }
  program
    .option('--no-open', 'Keep the browser closed')
    .option('--port <port>', 'Preferred local port', parsePort)
    .action(async (options: { open?: boolean; port?: number }) => showUI('.', options));
  program
    .command('ui')
    .description('Open the local project dashboard')
    .argument('[directory]', 'Project folder', '.')
    .option('--no-open', 'Keep the browser closed')
    .option('--port <port>', 'Preferred local port', parsePort)
    .action(showUI);

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
