#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createProgram } from './program.js';

const manifest: unknown = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

if (
  typeof manifest !== 'object' ||
  manifest === null ||
  !('version' in manifest) ||
  typeof manifest.version !== 'string'
) {
  throw new Error('The Overseer package is missing a valid version. Reinstall the package.');
}

try {
  await createProgram(manifest.version).parseAsync();
} catch (error: unknown) {
  console.error(
    error instanceof Error ? error.message : 'Overseer could not complete this command.',
  );
  process.exitCode = 2;
}
