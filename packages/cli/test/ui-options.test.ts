import { afterEach, expect, it, vi } from 'vitest';
import open from 'open';
import { startServer } from '../src/server.js';
import { createProgram } from '../src/program.js';

vi.mock('../src/server.js', () => ({
  startServer: vi.fn(async () => ({ url: 'http://127.0.0.1:54321', close: vi.fn() })),
}));
vi.mock('open', () => ({ default: vi.fn() }));
const originalInterrupts = process.listeners('SIGINT');
const originalTerminations = process.listeners('SIGTERM');
afterEach(() => {
  for (const listener of process.listeners('SIGINT'))
    if (!originalInterrupts.includes(listener)) process.removeListener('SIGINT', listener);
  for (const listener of process.listeners('SIGTERM'))
    if (!originalTerminations.includes(listener)) process.removeListener('SIGTERM', listener);
  vi.clearAllMocks();
});

it.each([
  ['ui', 'demo', '--no-open', '--port', '54321'],
  ['--no-open', '--port', '54321', 'ui', 'demo'],
])('honors UI flags parsed as global options: %j', async (...args: string[]) => {
  const program = createProgram('test').configureOutput({ writeOut: () => undefined });
  await program.parseAsync(args, { from: 'user' });
  expect(startServer).toHaveBeenCalledWith('demo', { port: 54321 });
  expect(open).not.toHaveBeenCalled();
});
