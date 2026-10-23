import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { configSchema } from '../config.js';
import type { Config } from '../config.js';
import type { ProjectModel } from '../model.js';
import { analyzeSource } from '../analyzers/source.js';
import type { SourceFacts } from '../analyzers/source.js';
import { analyzeSql } from '../analyzers/sql.js';
import type { SqlTable } from '../analyzers/sql.js';
import { importResolver, routeFor } from '../analyzers/imports.js';
import { discover, optionalText } from './files.js';
import type { Discovery } from './files.js';
import { gitInfo } from './git.js';
import { parseRules } from '../rules/parse.js';

export interface ScanContext {
  root: string;
  config: Config;
  model: ProjectModel;
  sources: Map<string, string>;
  facts: Map<string, SourceFacts>;
  sqlTables: SqlTable[];
  envFiles: Discovery['envFiles'];
  tracked: Set<string>;
}

export async function loadConfig(root: string): Promise<Config> {
  const content = await optionalText(path.join(root, '.overseer/config.json'), 100_000);
  try {
    return configSchema.parse(content === undefined ? {} : (JSON.parse(content) as unknown));
  } catch {
    throw new Error('Invalid .overseer/config.json. Use documented setting names and value types.');
  }
}

export async function scanContext(directory: string): Promise<ScanContext> {
  const root = path.resolve(directory);
  const config = await loadConfig(root);
  const rules = parseRules(
    (await optionalText(path.join(root, '.overseer/rules.md'), 100_000)) ?? '',
  );
  config.disabledChecks = config.disabledChecks.filter((id) => !rules.enforcedChecks.includes(id));
  if (rules.maxLines !== undefined) config.hugeFileLines = rules.maxLines;
  const discovered = await discover(root, config.ignore);
  const { sources, envFiles, diagnostics } = discovered;
  const manifestSchema = z.object({
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
  });
  let dependencies: Record<string, string>;
  try {
    const manifest = manifestSchema.parse(
      JSON.parse(sources.get('package.json') ?? '{}') as unknown,
    );
    dependencies = { ...manifest.devDependencies, ...manifest.dependencies };
  } catch {
    throw new Error('The project package.json is missing or invalid.');
  }
  if (!dependencies.next || ![...sources.keys()].some((file) => /^(src\/)?app\//.test(file)))
    throw new Error(
      'This version supports Next.js App Router projects. Choose a folder with package.json and app/ or src/app/.',
    );
  const info = await gitInfo(root);
  const model: ProjectModel = {
    createdAt: new Date().toISOString(),
    ...(info.commit ? { gitCommit: info.commit } : {}),
    stack: {
      framework: 'next-app',
      ...(dependencies['@supabase/supabase-js'] ||
      [...sources.keys()].some((file) => file.startsWith('supabase/'))
        ? { db: 'supabase' as const }
        : {}),
    },
    files: [],
    imports: [],
    pages: [],
    apis: [],
    tables: [],
    envVars: [],
    dependencies,
    features: [],
    findings: [],
    health: 100,
    diagnostics,
  };
  const facts = new Map<string, SourceFacts>();
  const resolve = importResolver(sources);
  for (const [file, content] of sources) {
    let parsed: SourceFacts | undefined;
    if (/\.[cm]?[jt]sx?$/.test(file) && !file.endsWith('.d.ts')) {
      try {
        parsed = analyzeSource(content, !/\.[cm]?ts$/.test(file));
        facts.set(file, parsed);
      } catch {
        diagnostics.push({
          file,
          message: 'Code could not be parsed. Its imports and risk patterns are unknown.',
        });
      }
    }
    model.files.push({
      path: file,
      lines: content ? content.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length : 0,
      hash: createHash('sha256').update(content).digest('hex'),
      isClient: parsed?.client ?? false,
    });
    const route = routeFor(file);
    if (route !== undefined) {
      if (/\/page\./.test(file)) model.pages.push({ route, file });
      else
        model.apis.push({
          route,
          file,
          methods: parsed?.methods.map((method) => method.name) ?? [],
        });
    }
    for (const specifier of parsed?.imports ?? []) {
      const target = resolve(file, specifier);
      if (target) model.imports.push([file, target]);
      else if (
        (specifier.startsWith('.') || specifier.startsWith('@/')) &&
        !/\.(?:css|scss|sass|less|svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf)(?:\?.*)?$/.test(
          specifier,
        )
      )
        diagnostics.push({ file, message: `A local import could not be resolved: ${specifier}.` });
    }
    for (const env of parsed?.env ?? []) {
      let variable = model.envVars.find((item) => item.name === env.name);
      if (!variable) {
        variable = { name: env.name, public: env.name.startsWith('NEXT_PUBLIC_'), usedIn: [] };
        model.envVars.push(variable);
      }
      if (!variable.usedIn.includes(file)) variable.usedIn.push(file);
    }
  }
  const clients = new Set(model.files.filter((file) => file.isClient).map((file) => file.path));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [from, to] of model.imports)
      if (clients.has(from) && !clients.has(to)) {
        clients.add(to);
        changed = true;
      }
  }
  for (const file of model.files) file.isClient = clients.has(file.path);
  const sqlTables = analyzeSql(sources);
  for (const table of sqlTables)
    model.tables.push({ name: table.name, rls: table.rls, usedIn: [] });
  for (const [file, parsed] of facts)
    for (const access of parsed.tables) {
      let table = model.tables.find((item) => item.name === access.name);
      if (!table) {
        table = { name: access.name, rls: null, usedIn: [] };
        model.tables.push(table);
      }
      if (!table.usedIn.includes(file)) table.usedIn.push(file);
    }
  model.envVars.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  model.tables.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { root, config, model, sources, facts, sqlTables, envFiles, tracked: info.tracked };
}

export async function scanProject(root: string): Promise<ProjectModel> {
  return (await scanContext(root)).model;
}
