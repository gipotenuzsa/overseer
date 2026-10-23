import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/program.js';

function runCli(args: string[]) {
  let stdout = '';
  let stderr = '';
  const program = createProgram('0.1.0-test')
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        stdout += text;
      },
      writeErr: (text) => {
        stderr += text;
      },
    });

  let exitCode = 0;
  try {
    program.parse(args, { from: 'user' });
  } catch (error: unknown) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('exitCode' in error) ||
      typeof error.exitCode !== 'number'
    ) {
      throw error;
    }
    exitCode = error.exitCode;
  }

  return { stdout, stderr, exitCode };
}

describe('CLI entry behavior', () => {
  it('shows honest help by default instead of claiming to scan a project', () => {
    const result = runCli([]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: overseer');
    expect(result.stdout).toContain('project scanning is not implemented yet');
  });

  it('supports explicit help with a successful exit', () => {
    const result = runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--version');
    expect(result.stderr).toBe('');
  });

  it('prints the supplied package version', () => {
    expect(runCli(['--version'])).toEqual({
      stdout: '0.1.0-test\n',
      stderr: '',
      exitCode: 0,
    });
  });

  it('rejects unsupported commands instead of silently succeeding', () => {
    const result = runCli(['scan']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('error:');
    expect(result.stdout).toBe('');
  });

  it('rejects unknown flags with a failure exit code', () => {
    const result = runCli(['--unknown']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("unknown option '--unknown'");
    expect(result.stdout).toBe('');
  });
});
