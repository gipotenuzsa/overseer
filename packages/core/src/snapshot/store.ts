import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { managedDirectory, atomicWrite } from '../storage.js';
import { readText } from '../scanner/files.js';
import type { ProjectModel } from '../model.js';
import { healthScore } from '../health/score.js';
import { snapshotSchema } from './schema.js';

export interface Snapshot {
  id: string;
  savedAt: string;
  model: ProjectModel;
}
export async function saveSnapshot(root: string, model: ProjectModel): Promise<string> {
  const directory = await managedDirectory(root, 'snapshots');
  const findings = model.findings.filter((item) => item.checkId !== 'new-dependency');
  const snapshot = snapshotSchema.parse({
    version: 1,
    savedAt: new Date().toISOString(),
    model: { ...model, findings, health: healthScore(findings) },
  });
  const name = `${snapshot.savedAt.replaceAll(':', '-')}-${randomUUID().slice(0, 8)}.json`;
  await atomicWrite(path.join(directory, name), JSON.stringify(snapshot, null, 2) + '\n');
  return name;
}
export async function listSnapshots(root: string): Promise<Snapshot[]> {
  const directory = await managedDirectory(root, 'snapshots');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort();
  if (files.length > 2000)
    throw new Error(
      'There are more than 2,000 snapshots. Move older snapshots to an archive folder.',
    );
  const snapshots: Snapshot[] = [];
  for (const file of files) {
    try {
      const data = snapshotSchema.parse(
        JSON.parse(await readText(path.join(directory, file), 20_000_000)) as unknown,
      );
      snapshots.push({ id: file, savedAt: data.savedAt, model: data.model as ProjectModel });
    } catch {
      throw new Error(
        `Snapshot ${file} is invalid or unsupported. Move it out of .overseer/snapshots and retry. It was not overwritten.`,
      );
    }
  }
  return snapshots.sort((a, b) => a.savedAt.localeCompare(b.savedAt) || a.id.localeCompare(b.id));
}
