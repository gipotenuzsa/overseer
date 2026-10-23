import { z } from 'zod';

const strings = z.array(z.string());
export const findingSchema = z.object({
  id: z.string(),
  checkId: z.string(),
  level: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  whyDangerous: z.string(),
  file: z.string(),
  line: z.number().int().positive().optional(),
  message: z.string(),
  fixPrompt: z.string(),
  featureId: z.string().optional(),
});
export const modelSchema = z.object({
  createdAt: z.string().datetime(),
  gitCommit: z.string().optional(),
  stack: z.object({ framework: z.literal('next-app'), db: z.literal('supabase').optional() }),
  files: z.array(
    z.object({
      path: z.string(),
      lines: z.number().int().nonnegative(),
      hash: z.string(),
      isClient: z.boolean(),
    }),
  ),
  imports: z.array(z.tuple([z.string(), z.string()])),
  pages: z.array(z.object({ route: z.string(), file: z.string() })),
  apis: z.array(z.object({ route: z.string(), file: z.string(), methods: strings })),
  tables: z.array(z.object({ name: z.string(), rls: z.boolean().nullable(), usedIn: strings })),
  envVars: z.array(z.object({ name: z.string(), public: z.boolean(), usedIn: strings })),
  dependencies: z.record(z.string(), z.string()),
  features: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      entry: z.string(),
      files: strings,
      tables: z.array(z.object({ name: z.string(), access: z.enum(['read', 'write']) })),
      apis: strings,
    }),
  ),
  findings: z.array(findingSchema),
  health: z.number().int().min(0).max(100),
  diagnostics: z.array(z.object({ file: z.string(), message: z.string() })),
});
export const snapshotSchema = z.object({
  version: z.literal(1),
  savedAt: z.string().datetime(),
  model: modelSchema,
});
