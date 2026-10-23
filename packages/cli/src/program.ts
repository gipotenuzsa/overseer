import { Command } from 'commander';
import { scanProject } from '@overseer/core';

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
      const model = await scanProject(directory);
      const output = options.json
        ? JSON.stringify(model, null, 2)
        : `${model.pages.length} pages, ${model.apis.length} APIs, ${model.tables.length} tables.\n`;
      program.configureOutput().writeOut?.(output + '\n');
    });

  return program;
}
