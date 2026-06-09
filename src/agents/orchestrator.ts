/**
 * Orchestrator - Main pipeline coordinator
 * Connects all agents: Schema Parser → Dependency Resolver → Strategy Planner → Data Generator → Output Formatter
 *
 * IMPORTANT: All randomness uses faker (not Math.random) to support --seed deterministic mode.
 */

import type {
  NormalizedSchema,
  NormalizedEntity,
  NormalizedField,
  StrategyPlan,
  GeneratedRecord,
  GenerationResult,
  GeneratedEntityData,
  GeneratorConfig,
  DomainContext,
  EdgeCaseConfig,
  FieldStrategy,
  EntityStrategy,
} from '../types/index.js';

import { parsePrismaSchema, parseDDLSchema } from './schema-parser/index.js';
import { buildDependencyGraph, generateSelfReferentialStrategy } from './dependency-resolver/index.js';
import { assignStrategies } from './strategy-planner/index.js';
import { generateFakerValue, resetUniqueTracker, pickFkValue, injectEdgeCases, validateIntegrity } from './data-generator/index.js';
import { weightedRandom, assignActivityLevel, orderCountByLevel, generateRealisticTimestamp, logNormalPrice, exponentialQuantity } from './data-generator/index.js';
import { formatPrismaSeed, formatSQLInserts, formatJSONFixtures, formatAllCSV, formatFactoryFunctions } from './output-formatter/index.js';
import { OllamaClient } from '../ml/ollama-client.js';
import { LLMClient } from '../tools/llm-client.js';
import { parseConfig, getDefaultConfig } from '../tools/config-parser.js';
import {
  generateVietnamesePhone,
  generateVietnameseCCCD,
} from '../ml/vietnamese-generator.js';
import { faker } from '@faker-js/faker/locale/vi';

export class Orchestrator {
  private config: GeneratorConfig;
  private ollamaClient: OllamaClient;
  private llmClient: LLMClient;

  constructor(config?: Partial<GeneratorConfig>) {
    if (config) {
      const defaults = getDefaultConfig();
      this.config = {
        version: config.version ?? defaults.version,
        schema: config.schema ?? defaults.schema,
        output: config.output ?? defaults.output,
        generation: { ...defaults.generation, ...config.generation },
        entities: (config.entities ?? defaults.entities) as Record<string, import('../types/index.js').EntityConfig>,
        edgeCases: config.edgeCases ?? defaults.edgeCases,
        ollama: config.ollama ?? defaults.ollama,
      };
    } else {
      this.config = getDefaultConfig();
    }
    this.ollamaClient = new OllamaClient(this.config.ollama);
    this.llmClient = new LLMClient();
  }

  /**
   * Main pipeline: Schema → NormalizedSchema → StrategyPlan → GeneratedData → Output
   */
  async generate(): Promise<GenerationResult> {
    const startTime = Date.now();

    // Step 1: Parse Schema
    console.log('\uD83D\uDCCB Step 1: Parsing schema...');
    const schema = await this.parseSchema();
    console.log('  Found ' + schema.entities.length + ' entities, ' + schema.relations.length + ' relations, ' + schema.enums.length + ' enums');

    // Step 2: Detect Domain
    console.log('\uD83D\uDD0D Step 2: Detecting domain...');
    const domain = await this.detectDomain(schema);
    console.log('  Domain: ' + domain.domain + ', Market: ' + domain.market);

    // Step 3: Resolve Dependencies
    console.log('\uD83D\uDD17 Step 3: Resolving dependencies...');
    const depGraph = buildDependencyGraph(schema);
    if (depGraph.cycles.length > 0) {
      console.warn('\u26A0\uFE0F  Circular dependencies detected: ' + depGraph.cycles.map(c => c.join(' \u2192 ')).join(', '));
    }
    console.log('  Seed order: ' + depGraph.seedOrder.join(' \u2192 '));

    // Step 4: Plan Strategies
    console.log('\uD83D\uDCCA Step 4: Planning generation strategies...');
    const strategy = assignStrategies(schema, domain, this.config.entities, this.config.edgeCases);

    // Step 5: Generate Data
    console.log('\uD83C\uDFED Step 5: Generating data...');
    const generatedData = await this.generateData(schema, strategy, depGraph.seedOrder);

    // Step 6: Inject Edge Cases
    console.log('\uD83E\uDDEA Step 6: Injecting edge cases...');
    const withEdgeCases = this.applyEdgeCases(generatedData, schema);

    // Step 7: Validate Integrity
    console.log('\u2705 Step 7: Validating referential integrity...');
    const recordsMap = new Map<string, GeneratedRecord[]>();
    for (const [name, entityData] of withEdgeCases) {
      recordsMap.set(name, entityData.records);
    }
    const validationResult = validateIntegrity(schema, recordsMap);
    if (!validationResult.valid) {
      console.warn('\u26A0\uFE0F  Integrity validation found ' + validationResult.errors.length + ' issues:');
      validationResult.errors.slice(0, 10).forEach(e => console.warn('    - ' + e.message));
    }

    // Step 8: Format Output
    console.log('\uD83D\uDCDD Step 8: Formatting output...');
    await this.formatOutput(withEdgeCases, depGraph.seedOrder, schema, domain);

    const elapsed = Date.now() - startTime;
    const stats = {
      totalRecords: Array.from(withEdgeCases.values()).reduce((s, e) => s + e.records.length, 0),
      perEntity: Object.fromEntries(Array.from(withEdgeCases.entries()).map(([k, v]) => [k, v.records.length] as [string, number])),
      generationTimeMs: elapsed,
      ollamaCalls: 0,
      ollamaFallbacks: 0,
      edgeCaseRecords: Math.floor(Array.from(withEdgeCases.values()).reduce((s, e) => s + e.records.length, 0) * (this.config.edgeCases.percentage / 100)),
    };

    console.log('\n\uD83C\uDF89 Generation complete!');
    console.log('  Total records: ' + stats.totalRecords);
    console.log('  Time: ' + (elapsed / 1000).toFixed(1) + 's');

    return {
      data: withEdgeCases,
      seedOrder: depGraph.seedOrder,
      statistics: stats,
    };
  }

  private async parseSchema(): Promise<NormalizedSchema> {
    const schemaPath = this.config.schema.path;
    const schemaType = this.config.schema.type;

    switch (schemaType) {
      case 'prisma':
        return parsePrismaSchema(schemaPath);
      case 'ddl': {
        const { readFile } = await import('fs/promises');
        const sqlText = await readFile(schemaPath, 'utf-8');
        return parseDDLSchema(sqlText);
      }
      default:
        throw new Error('Unsupported schema type: ' + schemaType + '. Supported: prisma, ddl');
    }
  }

  private async detectDomain(schema: NormalizedSchema): Promise<DomainContext> {
    return this.llmClient.detectDomain(
      schema.entities.map(e => e.name + ' (' + e.fields.map(f => f.name + ':' + f.type).join(', ') + ')').join('\n'),
    );
  }

  private async generateData(
    schema: NormalizedSchema,
    strategy: StrategyPlan,
    seedOrder: string[],
  ): Promise<Map<string, GeneratedEntityData>> {
    if (this.config.generation.seed) {
      faker.seed(this.config.generation.seed);
    }
    resetUniqueTracker();

    const data = new Map<string, GeneratedEntityData>();
    await this.ollamaClient.checkAvailability();

    for (const entityName of seedOrder) {
      const entity = schema.entities.find(e => e.name === entityName);
      if (!entity) continue;

      const entityStrategy = strategy.entities.find(e => e.entityName === entityName);
      const count = entityStrategy?.count ?? 100;

      console.log('  Generating ' + count + ' records for ' + entityName + '...');

      const records: GeneratedRecord[] = [];
      const selfRefField = entity.fields.find(f => f.isForeignKey && f.referencedEntity === entityName);
      const isSelfRef = !!selfRefField;

      if (isSelfRef) {
        const { pass1Count, pass2Count } = generateSelfReferentialStrategy(entityName, count);
        
        // Pass 1: root records (no parent)
        for (let i = 0; i < pass1Count; i++) {
          const record = this.generateRecord(entity, entityStrategy!, i, data, schema, count);
          record[selfRefField!.name] = null;
          records.push(record);
        }

        // Pass 2: children with parent reference
        for (let i = 0; i < pass2Count; i++) {
          const record = this.generateRecord(entity, entityStrategy!, pass1Count + i, data, schema, count);
          // Pick a random parent from pass 1 records using faker
          const parentIdx = faker.number.int({ min: 0, max: pass1Count - 1 });
          record[selfRefField!.name] = records[parentIdx][entity.primaryKey];
          records.push(record);
        }
      } else {
        for (let i = 0; i < count; i++) {
          records.push(this.generateRecord(entity, entityStrategy!, i, data, schema, count));
        }
      }

      data.set(entityName, { entityName, records, seedOrder: seedOrder.indexOf(entityName) });
    }

    return data;
  }

  private generateRecord(
    entity: NormalizedEntity,
    entityStrategy: EntityStrategy,
    index: number,
    existingData: Map<string, GeneratedEntityData>,
    schema: NormalizedSchema,
    totalCount: number,
  ): GeneratedRecord {
    const record: GeneratedRecord = {};
    const isVietnamese = this.config.generation.market === 'vietnam';

    for (const fieldStrategy of entityStrategy.fieldStrategies) {
      const field = entity.fields.find(f => f.name === fieldStrategy.fieldName);
      if (!field) continue;

      // Auto-increment fields: skip
      if (field.isAutoIncrement) continue;

      // Primary key with UUID type: generate UUID
      if (field.name === entity.primaryKey && field.type === 'uuid') {
        record[field.name] = faker.string.uuid();
        continue;
      }

      switch (fieldStrategy.strategy) {
        case 'auto-increment':
          record[field.name] = index + 1;
          break;

        case 'fk-lookup': {
          const refEntity = fieldStrategy.params?.['referencedEntity'] as string | undefined;
          const refField = (fieldStrategy.params?.['referencedField'] as string | undefined) ?? 'id';
          if (refEntity) {
            const parentData = existingData.get(refEntity);
            if (parentData && parentData.records.length > 0) {
              // Use faker for deterministic FK selection
              record[field.name] = faker.helpers.arrayElement(parentData.records)[refField];
            } else {
              record[field.name] = null;
            }
          }
          break;
        }

        case 'faker':
          record[field.name] = generateFakerValue(fieldStrategy, field, index, faker);
          break;

        case 'domain-rule':
          record[field.name] = this.generateDomainRuleValue(fieldStrategy, index, isVietnamese);
          break;

        case 'distribution':
          record[field.name] = this.generateDistributionValue(fieldStrategy, field, entity, index, totalCount);
          break;

        case 'ollama':
          // Will be filled via Ollama or fall back to faker
          record[field.name] = faker.lorem.paragraph(2);
          break;

        case 'constant':
          record[field.name] = fieldStrategy.params?.['value'] ?? null;
          break;

        default:
          record[field.name] = generateFakerValue(fieldStrategy, field, index, faker);
      }
    }

    return record;
  }

  private generateDomainRuleValue(strategy: FieldStrategy, index: number, isVietnamese: boolean): unknown {
    const rule = strategy.params?.['rule'] as string | undefined;
    
    switch (rule) {
      case 'vietnameseName':
        return generateVietnameseNameSync();

      case 'vietnamesePhone':
        return generateVietnamesePhone();

      case 'vietnameseAddress':
        return generateVietnameseAddressSync();

      case 'vietnameseCCCD':
        return generateVietnameseCCCD();

      case 'vietnameseGivenName': {
        const givenNames = ['Anh', 'B\u00ECnh', 'C\u01B0\u1EDDng', 'D\u0169ng', 'H\u01B0\u01A1ng', 'Linh', 'Mai', 'Nam', 'Ph\u01B0\u01A1ng', 'Thanh', 'Trang', 'Tu\u1EA5n', 'H\u00E0', 'Kh\u00E1nh', 'Minh', 'Th\u1EA3o', 'Y\u1EBFn'];
        return faker.helpers.arrayElement(givenNames);
      }

      case 'vietnameseSurname': {
        const surnames = ['Nguy\u1EC5n', 'Tr\u1EA7n', 'L\u00EA', 'Ph\u1EA1m', 'Ho\u00E0ng', 'Hu\u1EF3nh', 'Phan', 'V\u0169', 'V\u00F5', '\u0110\u1EB7ng', 'B\u00F9i', '\u0110\u1ED7', 'H\u1ED3', 'Ng\u00F4'];
        return faker.helpers.arrayElement(surnames);
      }

      case 'vietnameseCity': {
        const cities = ['TP. H\u1ED3 Ch\u00ED Minh', 'H\u00E0 N\u1ED9i', '\u0110\u00E0 N\u1EB5ng', 'C\u1EA7n Th\u01A1', 'B\u00ECnh D\u01B0\u01A1ng', '\u0110\u1ED3ng Nai', 'H\u1EA3i Ph\u00F2ng'];
        return faker.helpers.arrayElement(cities);
      }

      default:
        return faker.lorem.word();
    }
  }

  private generateDistributionValue(
    strategy: FieldStrategy,
    field: NormalizedField,
    entity: NormalizedEntity,
    index: number,
    totalCount: number,
  ): unknown {
    const distribution = strategy.params?.['distribution'] as string | undefined;

    switch (distribution) {
      case 'weighted': {
        const weights = strategy.params?.['weights'] as Record<string, number> | undefined;
        if (weights) {
          return weightedRandom(weights);
        }
        const values = strategy.params?.['values'] as string[] | undefined;
        if (values && values.length > 0) {
          return faker.helpers.arrayElement(values);
        }
        if (field.enumValues && field.enumValues.length > 0) {
          return faker.helpers.arrayElement(field.enumValues);
        }
        return faker.lorem.word();
      }

      case 'business-hours':
      case 'evening-peak':
      case 'uniform':
        return generateRealisticTimestamp(
          distribution as 'business-hours' | 'evening-peak' | 'uniform',
          new Date('2023-01-01'),
          new Date('2025-12-31'),
        );

      case 'logNormal':
        return logNormalPrice(
          (strategy.params?.['meanLog'] as number) ?? 13,
          (strategy.params?.['stdLog'] as number) ?? 1.5,
        );

      case 'pareto': {
        const level = assignActivityLevel(index, totalCount);
        return orderCountByLevel[level]();
      }

      case 'exponential':
        return exponentialQuantity((strategy.params?.['mean'] as number) ?? 2);

      default:
        if (field.enumValues && field.enumValues.length > 0) {
          return faker.helpers.arrayElement(field.enumValues);
        }
        return faker.lorem.word();
    }
  }

  private applyEdgeCases(
    data: Map<string, GeneratedEntityData>,
    schema: NormalizedSchema,
  ): Map<string, GeneratedEntityData> {
    const result = new Map<string, GeneratedEntityData>();

    for (const entity of schema.entities) {
      const entityData = data.get(entity.name);
      if (!entityData) continue;

      const records = injectEdgeCases([...entityData.records], entity, this.config.edgeCases);
      result.set(entity.name, { ...entityData, records });
    }

    return result;
  }

  private async formatOutput(
    data: Map<string, GeneratedEntityData>,
    seedOrder: string[],
    schema: NormalizedSchema,
    domain: DomainContext,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const outputDir = this.config.output.directory;

    await fs.mkdir(outputDir, { recursive: true });

    const recordsMap = new Map<string, GeneratedRecord[]>();
    for (const [name, entityData] of data) {
      recordsMap.set(name, entityData.records);
    }

    for (const format of this.config.output.formats) {
      switch (format) {
        case 'prisma-seed': {
          const content = formatPrismaSeed(recordsMap, seedOrder);
          await fs.writeFile(path.join(outputDir, 'seed.ts'), content, 'utf-8');
          console.log('  \u2713 Written: seed.ts');
          break;
        }
        case 'sql': {
          const content = formatSQLInserts(recordsMap, seedOrder);
          await fs.writeFile(path.join(outputDir, 'seed.sql'), content, 'utf-8');
          console.log('  \u2713 Written: seed.sql');
          break;
        }
        case 'json': {
          const content = formatJSONFixtures(recordsMap);
          await fs.writeFile(path.join(outputDir, 'fixtures.json'), content, 'utf-8');
          console.log('  \u2713 Written: fixtures.json');
          break;
        }
        case 'csv': {
          const csvData = formatAllCSV(recordsMap);
          for (const [entity, csv] of csvData) {
            await fs.writeFile(path.join(outputDir, entity + '.csv'), csv, 'utf-8');
          }
          console.log('  \u2713 Written: ' + csvData.size + ' CSV files');
          break;
        }
        case 'factory': {
          const content = formatFactoryFunctions(schema.entities, domain);
          await fs.writeFile(path.join(outputDir, 'factories.ts'), content, 'utf-8');
          console.log('  \u2713 Written: factories.ts');
          break;
        }
      }
    }
  }
}

// ─── Sync fallbacks for Vietnamese data generation ────────────────
// These use faker (not Math.random) to support deterministic --seed mode.

const VN_SURNAMES = [
  { name: 'Nguy\u1EC5n', weight: 38.4 },
  { name: 'Tr\u1EA7n', weight: 11.1 },
  { name: 'L\u00EA', weight: 9.8 },
  { name: 'Ph\u1EA1m', weight: 7.4 },
  { name: 'Ho\u00E0ng', weight: 5.4 },
  { name: 'Hu\u1EF3nh', weight: 5.2 },
  { name: 'Phan', weight: 4.5 },
  { name: 'V\u0169', weight: 3.8 },
  { name: 'V\u00F5', weight: 3.5 },
  { name: '\u0110\u1EB7ng', weight: 2.7 },
  { name: 'B\u00F9i', weight: 2.0 },
  { name: '\u0110\u1ED7', weight: 1.4 },
  { name: 'H\u1ED3', weight: 1.3 },
  { name: 'Ng\u00F4', weight: 1.2 },
];

const VN_GIVEN_NAMES_F = ['Anh', 'B\u00ECnh', 'H\u01B0\u01A1ng', 'Linh', 'Mai', 'Ph\u01B0\u01A1ng', 'Thanh', 'Th\u1EA3o', 'Trang', 'Y\u1EBFn', 'H\u00E0', 'Kh\u00E1nh', 'Lan', 'Nhung', 'Qu\u1EF3nh'];
const VN_GIVEN_NAMES_M = ['Anh', 'B\u00ECnh', 'C\u01B0\u1EDDng', 'D\u0169ng', 'H\u00F9ng', 'Kh\u1EA3i', 'Minh', 'Nam', 'S\u01A1n', 'Tu\u1EA5n', '\u0110\u1EE9c', 'H\u1EEDu', 'Quang', 'Th\u1EAFng', 'Tr\u00ED'];
const VN_MIDDLE_NAMES = [
  { name: 'Th\u1ECB', gender: 'female' as const, weight: 40 },
  { name: 'V\u0103n', gender: 'male' as const, weight: 30 },
  { name: 'Minh', gender: 'neutral' as const, weight: 8 },
  { name: 'Thanh', gender: 'neutral' as const, weight: 5 },
  { name: '\u0110\u1EE9c', gender: 'male' as const, weight: 4 },
  { name: 'Kim', gender: 'female' as const, weight: 4 },
  { name: 'Ng\u1ECDc', gender: 'female' as const, weight: 3 },
  { name: 'H\u1EEDu', gender: 'male' as const, weight: 3 },
  { name: 'Th\u00FAy', gender: 'female' as const, weight: 2 },
  { name: 'Xu\u00E2n', gender: 'neutral' as const, weight: 1 },
];

const VN_STREETS = ['Nguy\u1EC5n Hu\u1EC7', 'L\u00EA L\u1EE3i', '\u0110\u1ED3ng Kh\u1EDFi', 'Hai B\u00E0 Tr\u01B0ng', 'Tr\u1EA7n H\u01B0ng \u0110\u1EA1o', 'L\u00FD Th\u01B0\u1EDDng Ki\u1EC7t', 'Phan X\u00EDch Long', 'C\u00E1ch M\u1EA1ng Th\u00E1ng 8', 'V\u00F5 V\u0103n T\u1EA7n', 'Nguy\u1EC5n \u0110\u00ECnh Chi\u1EC3u', 'L\u00EA V\u0103n S\u0129', 'Ng\u00F4 \u0110\u00ECnh Kh\u00F4i'];
const VN_DISTRICTS = ['Qu\u1EADn 1', 'Qu\u1EADn 3', 'Qu\u1EADn 7', 'B\u00ECnh Th\u1EA1nh', 'Th\u1EE7 \u0110\u1EE9c', 'Ph\u00FA Nhu\u1EADn', 'T\u00E2n B\u00ECnh', 'G\u00F2 V\u1EA5p', 'Qu\u1EADn 10', 'Qu\u1EADn 5'];
const VN_PROVINCES = ['TP. H\u1ED3 Ch\u00ED Minh', 'H\u00E0 N\u1ED9i', '\u0110\u00E0 N\u1EB5ng', 'C\u1EA7n Th\u01A1', 'B\u00ECnh D\u01B0\u01A1ng', '\u0110\u1ED3ng Nai', 'H\u1EA3i Ph\u00F2ng', 'Ngh\u1EC7 An', 'Thanh H\u00F3a'];

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  // Use faker for deterministic random
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generateVietnameseNameSync(): string {
  const surname = weightedPick(VN_SURNAMES).name;
  const gender = faker.helpers.arrayElement(['male', 'female'] as const);
  const givenNames = gender === 'female' ? VN_GIVEN_NAMES_F : VN_GIVEN_NAMES_M;
  const givenName = faker.helpers.arrayElement(givenNames);
  const middleOptions = VN_MIDDLE_NAMES.filter(m => m.gender === gender || m.gender === 'neutral');
  const middleName = weightedPick(middleOptions).name;
  return surname + ' ' + middleName + ' ' + givenName;
}

function generateVietnameseAddressSync(): string {
  const num = faker.number.int({ min: 1, max: 999 });
  const street = faker.helpers.arrayElement(VN_STREETS);
  const district = faker.helpers.arrayElement(VN_DISTRICTS);
  const province = faker.helpers.arrayElement(VN_PROVINCES);
  return num + ' ' + street + ', ' + district + ', ' + province;
}
