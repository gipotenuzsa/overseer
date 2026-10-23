import { Command } from 'commander';

export function createProgram(version: string): Command {
  const program = new Command()
    .name('overseer')
    .description('See what your AI coding agent actually built.')
    .version(version)
    .addHelpText(
      'after',
      '\nDevelopment preview: the workspace is ready; project scanning is not implemented yet.\n' +
        'Follow implementation progress in Project.md.',
    );

  program.action(() => {
    program.outputHelp();
  });

  return program;
}
