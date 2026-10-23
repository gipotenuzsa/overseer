import { z } from 'zod';

export const configSchema = z.object({
  ignore: z.array(z.string()).default([]),
  disabledChecks: z.array(z.string()).default([]),
  suppressions: z
    .array(
      z.object({
        checkId: z.string(),
        file: z.string(),
        line: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  hugeFileLines: z.number().int().min(20).max(100000).default(400),
  authHelpers: z.array(z.string()).default([]),
  publicApiRoutes: z.array(z.string()).default([]),
  ai: z
    .object({
      mode: z.enum(['off', 'agent', 'api']).default('off'),
      language: z.string().max(40).default('en'),
      endpoint: z.string().url().optional(),
      keyEnv: z.string().default('OPENAI_API_KEY'),
      model: z.string().default(''),
    })
    .default({ mode: 'off', language: 'en', keyEnv: 'OPENAI_API_KEY', model: '' }),
});

export type Config = z.infer<typeof configSchema>;
