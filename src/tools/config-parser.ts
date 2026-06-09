/**
 * Config Parser - YAML + Zod validation for generator configuration
 * Supports loading from YAML files, JSON files, and programmatic config objects
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';

// ─── Zod Schemas ────────────────────────────────────────────────────

const EdgeCaseScenarioSchema = z.enum([
  'null-nullable-fields',
  'max-length-strings',
  'boundary-dates',
  'unicode-names',
  'zero-amounts',
  'negative-amounts',
  'empty-strings',
  'sql-injection-strings',
  'duplicate-attempt',
  'inactive-deleted-simultaneous',
]);

const FieldOverrideSchema = z.object({
  strategy: z.enum(['faker', 'ollama', 'distribution', 'domain-rule', 'constant', 'fk-lookup', 'auto-increment']),
  template: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  weights: z.record(z.string(), z.number()).optional(),
});

const EntityConfigSchema = z.object({
  count: z.number().min(1).default(100),
  distribution: z.enum(['pareto', 'uniform', 'gaussian']).optional(),
  overrides: z.record(z.string(), FieldOverrideSchema).optional(),
  temporal: z.object({
    field: z.string(),
    distribution: z.enum(['business-hours', 'uniform', 'evening-peak']),
  }).optional(),
});

const SchemaConfigSchema = z.object({
  type: z.enum(['prisma', 'ddl', 'typeorm', 'jsonschema']),
  path: z.string(),
});

const OutputConfigSchema = z.object({
  formats: z.array(z.enum(['prisma-seed', 'sql', 'json', 'csv', 'factory'])),
  directory: z.string(),
  prettify: z.boolean().optional().default(true),
});

const GenerationConfigSchema = z.object({
  seed: z.number().optional(),
  market: z.enum(['vietnam', 'global', 'us', 'eu']),
  language: z.enum(['vi', 'en']),
  locale: z.string(),
});

const EdgeCaseConfigSchema = z.object({
  enabled: z.boolean(),
  percentage: z.number().min(0).max(50),
  scenarios: z.array(EdgeCaseScenarioSchema),
});

const OllamaConfigSchema = z.object({
  host: z.string(),
  model: z.string(),
  fallback: z.enum(['faker', 'fail']),
  temperature: z.number().min(0).max(2),
  concurrency: z.number().min(1).max(10),
});

export const GeneratorConfigSchema = z.object({
  version: z.string().default('1.0'),
  schema: SchemaConfigSchema,
  output: OutputConfigSchema,
  generation: GenerationConfigSchema,
  entities: z.record(z.string(), EntityConfigSchema),
  edgeCases: EdgeCaseConfigSchema,
  ollama: OllamaConfigSchema,
});

export type GeneratorConfig = z.infer<typeof GeneratorConfigSchema>;

// ─── Parsing ───────────────────────────────────────────────────────

export function parseConfig(raw: unknown): GeneratorConfig {
  return GeneratorConfigSchema.parse(raw);
}

export function getDefaultConfig(): GeneratorConfig {
  return GeneratorConfigSchema.parse({
    version: '1.0',
    schema: { type: 'prisma', path: './prisma/schema.prisma' },
    output: { formats: ['prisma-seed', 'json'], directory: './generated', prettify: true },
    generation: { market: 'vietnam', language: 'vi', locale: 'vi-VN' },
    entities: {},
    edgeCases: { enabled: true, percentage: 5, scenarios: ['null-nullable-fields', 'max-length-strings', 'boundary-dates', 'unicode-names', 'zero-amounts'] },
    ollama: { host: 'http://localhost:11434', model: 'llama3.1:8b', fallback: 'faker', temperature: 0.8, concurrency: 3 },
  });
}

/**
 * Load a config file from disk (YAML or JSON).
 * Uses js-yaml for .yaml/.yml files, JSON.parse for .json files.
 */
export async function loadConfigFile(filePath: string): Promise<GeneratorConfig> {
  const resolvedPath = resolve(filePath);
  const ext = extname(resolvedPath).toLowerCase();
  const raw = await readFile(resolvedPath, 'utf-8');

  let parsed: unknown;

  if (ext === '.yaml' || ext === '.yml') {
    const yaml = await import('js-yaml');
    parsed = yaml.load(raw);
  } else if (ext === '.json') {
    parsed = JSON.parse(raw);
  } else {
    throw new Error('Unsupported config file format: ' + ext + '. Supported: .yaml, .yml, .json');
  }

  return parseConfig(parsed);
}
