import path from 'node:path';
import type { Feature } from '../model.js';
import type { ScanContext } from '../scanner/scan.js';

export function groupFeatures(context: ScanContext): Feature[] {
  const { model, facts } = context;
  const features: Feature[] = [];
  const entries = [...model.pages, ...model.apis];
  for (const entry of entries) {
    if (
      model.apis.includes(entry as (typeof model.apis)[number]) &&
      features.some((feature) => feature.files.includes(entry.file))
    )
      continue;
    const files = new Set<string>();
    const queue = [entry.file];
    for (const file of model.files)
      if (
        /\/(?:layout|template)\.[jt]sx?$/.test(file.path) &&
        entry.file.startsWith(path.posix.dirname(file.path) + '/')
      )
        queue.push(file.path);
    while (queue.length) {
      const file = queue.shift()!;
      if (files.has(file)) continue;
      files.add(file);
      queue.push(...model.imports.filter(([from]) => from === file).map(([, to]) => to));
      for (const request of facts.get(file)?.requests ?? [])
        queue.push(...model.apis.filter((api) => api.route === request).map((api) => api.file));
    }
    const tables = new Map<string, 'read' | 'write'>();
    for (const file of files)
      for (const table of facts.get(file)?.tables ?? [])
        if (tables.get(table.name) !== 'write') tables.set(table.name, table.access);
    for (const table of context.sqlTables) if (tables.has(table.name)) files.add(table.file);
    const label =
      entry.route === '/'
        ? 'Home'
        : entry.route
            .split('/')
            .filter(Boolean)
            .map((part) => part.replaceAll('[', '').replaceAll(']', '').replace(/[-_]/g, ' '))
            .join(' ');
    features.push({
      id: entry.route,
      entry: entry.route,
      name: label.charAt(0).toUpperCase() + label.slice(1),
      files: [...files].sort(),
      tables: [...tables].map(([name, access]) => ({ name, access })),
      apis: model.apis.filter((api) => files.has(api.file)).map((api) => api.route),
    });
  }
  return features;
}
