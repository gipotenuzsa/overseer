import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { optionalText } from '../scanner/files.js';
import { managedDirectory, atomicWrite } from '../storage.js';
import { defaultRules, parseRules } from './parse.js';

export const startMarker = '<!-- overseer:start -->';
export const endMarker = '<!-- overseer:end -->';
export function mergeRules(original: string, rules: string): string {
  if (rules.includes(startMarker) || rules.includes(endMarker))
    throw new Error('rules.md must not contain Overseer managed block markers.');
  const starts = [...original.matchAll(/<!-- overseer:start -->/g)];
  const ends = [...original.matchAll(/<!-- overseer:end -->/g)];
  if (
    starts.length > 1 ||
    ends.length > 1 ||
    starts.length !== ends.length ||
    (starts[0] && ends[0] && starts[0].index > ends[0].index)
  )
    throw new Error(
      'An agent file has missing, repeated, or reversed Overseer markers. Fix its markers before syncing.',
    );
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const body = rules
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\r\n|\r|\n/g, eol);
  const block = `${startMarker}${eol}## Overseer project rules${eol}${eol}${body}${eol}${eol}At the end of your work, run \`npx overseer-cli diff\` in the project folder and show the report to the user. Explain any remaining findings.${eol}${endMarker}`;
  if (starts[0] && ends[0])
    return (
      original.slice(0, starts[0].index) + block + original.slice(ends[0].index + endMarker.length)
    );
  return (
    original +
    (original && !original.endsWith('\n') ? eol : '') +
    (original ? eol : '') +
    block +
    eol
  );
}

export async function syncRules(
  root: string,
  dryRun = false,
): Promise<{
  files: { file: string; changed: boolean }[];
  supported: string[];
  forwarded: string[];
}> {
  const rulesFile = path.join(root, '.overseer/rules.md');
  const existing = await optionalText(rulesFile, 100_000);
  const rules = existing ?? defaultRules;
  const plans: { file: string; before: string | undefined; after: string }[] = [];
  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    let before: string | undefined;
    try {
      before = await optionalText(path.join(root, file), 1_000_000);
    } catch {
      throw new Error(
        `${file} must be a regular UTF-8 file under 1 MB. No agent files were changed.`,
      );
    }
    plans.push({ file, before, after: mergeRules(before ?? '', rules) });
  }
  if (!dryRun) {
    await managedDirectory(root);
    const changed: typeof plans = [];
    try {
      for (const plan of plans)
        if (plan.before !== plan.after) {
          await atomicWrite(path.join(root, plan.file), plan.after);
          changed.push(plan);
        }
      if (existing === undefined) await atomicWrite(rulesFile, rules);
    } catch (error: unknown) {
      for (const plan of changed.reverse()) {
        if (plan.before === undefined) await unlink(path.join(root, plan.file));
        else await atomicWrite(path.join(root, plan.file), plan.before);
      }
      throw error;
    }
  }
  const parsed = parseRules(rules);
  return {
    files: plans.map((plan) => ({ file: plan.file, changed: plan.before !== plan.after })),
    supported: parsed.supported,
    forwarded: parsed.forwarded,
  };
}
