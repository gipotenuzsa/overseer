import { Command } from 'commander';
import { analyzeProject } from '@overseer/core';
import { formatScan } from './format.js';

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
      const output = options.json ? JSON.stringify(model, null, 2) : formatScan(model);
      program.configureOutput().writeOut?.(output + '\n');
    });

  return program;
}
