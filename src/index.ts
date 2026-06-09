#!/usr/bin/env node
/**
 * vibe-mock-data-generator-agent
 * Generate realistic, referentially valid test data from database schemas
 * with Vietnamese data specialization
 *
 * Usage:
 *   npx vibe-mock-data generate --schema ./prisma/schema.prisma
 *   npx vibe-mock-data generate --config ./mock-data.config.yaml
 *   npx vibe-mock-data generate --schema ./schema.sql --type ddl
 *   npx vibe-mock-data generate --schema ./schema.sql --quick --seed 42
 */

import { Orchestrator } from './agents/orchestrator.js';
import { getDefaultConfig, parseConfig, loadConfigFile } from './tools/config-parser.js';
import type { GeneratorConfig, SchemaSource } from './types/index.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

export { Orchestrator } from './agents/orchestrator.js';
export { parsePrismaSchema } from './agents/schema-parser/prisma-parser.js';
export { parseDDLSchema } from './agents/schema-parser/ddl-parser.js';
export { parseTypeORMSchema } from './agents/schema-parser/typeorm-parser.js';
export { parseJSONSchemaSchema } from './agents/schema-parser/jsonschema-parser.js';
export { buildDependencyGraph } from './agents/dependency-resolver/index.js';
export { assignStrategies } from './agents/strategy-planner/index.js';
export { OllamaClient } from './ml/ollama-client.js';
export { LLMClient } from './tools/llm-client.js';
export { parseConfig, getDefaultConfig, loadConfigFile } from './tools/config-parser.js';
export type { GeneratorConfig, NormalizedSchema, StrategyPlan, GenerationResult } from './types/index.js';

// ─── CLI Helpers ───────────────────────────────────────────────────

function detectSchemaType(filePath: string): SchemaSource {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'prisma': return 'prisma';
    case 'sql': return 'ddl';
    case 'ts':
    case 'js':
      // Heuristic: if file mentions TypeORM decorators
      return 'typeorm';
    case 'json':
      return 'jsonschema';
    default:
      return 'ddl';
  }
}

function parseCliArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[key] = args[++i];
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

function printHelp(): void {
  console.log('vibe-mock-data-generator-agent v1.0.0');
  console.log('');
  console.log('Generate realistic, referentially valid test data from database schemas');
  console.log('with Vietnamese data specialization.');
  console.log('');
  console.log('Usage:');
  console.log('  npx vibe-mock-data generate --schema ./prisma/schema.prisma');
  console.log('  npx vibe-mock-data generate --config ./mock-data.config.yaml');
  console.log('  npx vibe-mock-data generate --schema ./schema.sql --type ddl');
  console.log('  npx vibe-mock-data generate --schema ./schema.sql --quick --seed 42');
  console.log('');
  console.log('Options:');
  console.log('  --schema <path>       Path to schema file (required unless --config)');
  console.log('  --type <type>         Schema type: prisma | ddl | typeorm | jsonschema');
  console.log('                        (auto-detected from file extension if omitted)');
  console.log('  --config <path>       Path to config YAML/JSON file');
  console.log('  --output <dir>        Output directory (default: ./generated)');
  console.log('  --format <formats>    Output formats: prisma-seed,sql,json,csv,factory');
  console.log('                        (comma-separated, default: prisma-seed,json)');
  console.log('  --seed <number>       Random seed for deterministic output');
  console.log('  --market <market>     Market: vietnam | global | us | eu');
  console.log('  --quick               Quick mode: skip Ollama, JSON only, 100 records');
  console.log('  --help                Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  # Generate from Prisma schema with Vietnamese defaults');
  console.log('  npx vibe-mock-data generate --schema ./prisma/schema.prisma');
  console.log('');
  console.log('  # Generate from SQL DDL, output SQL + JSON');
  console.log('  npx vibe-mock-data generate --schema ./schema.sql --format sql,json');
  console.log('');
  console.log('  # Deterministic generation for CI/CD');
  console.log('  npx vibe-mock-data generate --schema ./schema.sql --seed 42');
  console.log('');
  console.log('  # Quick mode (no Ollama, minimal output)');
  console.log('  npx vibe-mock-data generate --schema ./schema.sql --quick');
}

// ─── Main CLI Entry ────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const parsed = parseCliArgs(args);

  // Handle --config file
  let config: GeneratorConfig;
  if (parsed.config && typeof parsed.config === 'string') {
    const configPath = resolve(parsed.config);
    if (!existsSync(configPath)) {
      console.error('Error: Config file not found: ' + configPath);
      process.exit(1);
    }
    try {
      config = await loadConfigFile(configPath);
    } catch (err) {
      console.error('Error: Failed to parse config file: ' + configPath);
      console.error(err);
      process.exit(1);
    }
  } else if (parsed.schema && typeof parsed.schema === 'string') {
    const schemaPath = resolve(parsed.schema);
    const schemaType = (typeof parsed.type === 'string'
      ? parsed.type
      : detectSchemaType(schemaPath)) as SchemaSource;

    const defaults = getDefaultConfig();
    const outputDir = typeof parsed.output === 'string' ? resolve(parsed.output) : defaults.output.directory;

    let formats = defaults.output.formats;
    if (typeof parsed.format === 'string') {
      formats = parsed.format.split(',').map((f: string) => f.trim() as typeof formats[number]);
    }
    if (parsed.quick) {
      formats = ['json'];
    }

    const market = typeof parsed.market === 'string' ? parsed.market as 'vietnam' | 'global' | 'us' | 'eu' : defaults.generation.market;
    const seed = typeof parsed.seed === 'string' ? parseInt(parsed.seed, 10) : undefined;

    config = {
      ...defaults,
      schema: { type: schemaType, path: schemaPath },
      output: { ...defaults.output, formats, directory: outputDir },
      generation: {
        ...defaults.generation,
        market,
        ...(seed !== undefined ? { seed } : {}),
      },
    };
  } else {
    console.error('Error: --schema or --config is required. Use --help for usage information.');
    process.exit(1);
  }

  // Run the generation pipeline
  const orchestrator = new Orchestrator(config);
  try {
    const result = await orchestrator.generate();
    console.log('\n\u2728 Done! Generated ' + result.statistics.totalRecords + ' records in ' + (result.statistics.generationTimeMs / 1000).toFixed(1) + 's');
  } catch (error) {
    console.error('\n\u274C Generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
