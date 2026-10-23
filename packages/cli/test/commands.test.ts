import { expect, it } from 'vitest';
import { createProgram } from '../src/program.js';
import { copyFixture } from '../../core/test/helpers.js';

async function command(args: string[]): Promise<{ output: string; exitCode: string | number }> {
  let output = '';
  const previous = process.exitCode;
  process.exitCode = 0;
  try {
    await createProgram('test')
      .exitOverride()
      .configureOutput({
        writeOut: (text) => {
          output += text;
        },
      })
      .parseAsync(args, { from: 'user' });
    return { output, exitCode: process.exitCode ?? 0 };
  } finally {
    process.exitCode = previous;
  }
}

it('check returns code 1 for critical findings and 0 for a clean fixture', async () => {
  const good = await copyFixture();
  const bad = await copyFixture('bad');
  expect((await command(['check', good, '--json'])).exitCode).toBe(0);
  const failed = await command(['check', bad, '--json']);
  expect(failed.exitCode).toBe(1);
  expect(JSON.parse(failed.output)).toHaveProperty('health', 18);
});

it('diff emits valid JSON on first and repeated runs and saves an HTML report', async () => {
  const root = await copyFixture();
  expect(JSON.parse((await command(['diff', root, '--json'])).output)).toMatchObject({
    firstRun: true,
    reportFile: expect.stringContaining('.html'),
  });
  expect(JSON.parse((await command(['diff', root, '--json'])).output)).toMatchObject({
    firstRun: false,
    files: { added: [], changed: [], removed: [] },
  });
});
