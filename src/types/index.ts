/**
 * Core type definitions for vibe-mock-data-generator-agent
 * These types define the entire data flow pipeline:
 * NormalizedSchema → StrategyPlan → GeneratedData → OutputFormat
 */

// ═══ Schema Types ═══════════════════════════════════════════════════

export type SchemaSource = 'prisma' | 'ddl' | 'typeorm' | 'jsonschema' | 'mongodb';

export type FieldType =
  | 'string'
  | 'int'
  | 'float'
  | 'boolean'
  | 'datetime'
  | 'uuid'
  | 'enum'
  | 'json'
  | 'bytes'
  | 'bigint'
  | 'decimal'
  | 'date';

export interface NormalizedEntity {
  name: string;
  tableName: string;
  fields: NormalizedField[];
  primaryKey: string;
  indexes: Index[];
}

export interface NormalizedField {
  name: string;
  type: FieldType;
  isRequired: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  defaultValue?: unknown;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  enumValues?: string[];
  isForeignKey: boolean;
  referencedEntity?: string;
  referencedField?: string;
  isNullable: boolean;
}

export interface Index {
  name: string;
  fields: string[];
  isUnique: boolean;
}

export interface Relation {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  junctionTable?: string;
  isRequired: boolean;
  cascadeDelete: boolean;
}

export interface EnumDefinition {
  name: string;
  values: string[];
}

export interface NormalizedSchema {
  entities: NormalizedEntity[];
  relations: Relation[];
  enums: EnumDefinition[];
  source: SchemaSource;
}

// ═══ Strategy Types ═════════════════════════════════════════════════

export type GenerationStrategy =
  | 'faker'         // Structured data via Faker.js
  | 'ollama'        // Contextual text via local SLM
  | 'distribution'  // Statistical distribution (Pareto, etc.)
  | 'domain-rule'   // Domain-specific rule (Vietnamese name, phone, etc.)
  | 'constant'      // Fixed value
  | 'fk-lookup'     // Foreign key lookup from parent entity
  | 'auto-increment'; // Auto-incrementing ID

export interface FieldStrategy {
  fieldName: string;
  entityName: string;
  strategy: GenerationStrategy;
  params?: Record<string, unknown>; // Strategy-specific parameters
}

export interface EntityStrategy {
  entityName: string;
  count: number;
  distribution?: 'pareto' | 'uniform' | 'gaussian';
  temporal?: {
    field: string;
    distribution: 'business-hours' | 'uniform' | 'evening-peak';
  };
  fieldStrategies: FieldStrategy[];
}

export interface StrategyPlan {
  entities: EntityStrategy[];
  edgeCases: EdgeCaseConfig;
  domain: DomainContext;
}

// ═══ Domain Detection Types ═════════════════════════════════════════

export type BusinessDomain =
  | 'ecommerce'
  | 'healthcare'
  | 'logistics'
  | 'fintech'
  | 'social'
  | 'education'
  | 'hr'
  | 'saas'
  | 'restaurant'
  | 'realestate'
  | 'generic';

export type MarketRegion = 'vietnam' | 'global' | 'us' | 'eu';

export interface DomainContext {
  domain: BusinessDomain;
  market: MarketRegion;
  language: 'vi' | 'en';
  locale: string;
  tables: TablePurpose[];
  hints: Record<string, string>;
}

export interface TablePurpose {
  name: string;
  purpose: string;
  hints: string[];
}

// ═══ Generation Types ═══════════════════════════════════════════════

export type ActivityLevel = 'whale' | 'heavy' | 'moderate' | 'light' | 'dormant';

export interface GeneratedRecord {
  [fieldName: string]: unknown;
}

export interface GeneratedEntityData {
  entityName: string;
  records: GeneratedRecord[];
  seedOrder: number;
}

export interface GenerationResult {
  data: Map<string, GeneratedEntityData>;
  seedOrder: string[];
  statistics: GenerationStatistics;
}

export interface GenerationStatistics {
  totalRecords: number;
  perEntity: Record<string, number>;
  generationTimeMs: number;
  ollamaCalls: number;
  ollamaFallbacks: number;
  edgeCaseRecords: number;
}

// ═══ Edge Case Types ═══════════════════════════════════════════════

export type EdgeCaseScenario =
  | 'null-nullable-fields'
  | 'max-length-strings'
  | 'boundary-dates'
  | 'unicode-names'
  | 'zero-amounts'
  | 'negative-amounts'
  | 'empty-strings'
  | 'sql-injection-strings'
  | 'duplicate-attempt'
  | 'inactive-deleted-simultaneous';

export interface EdgeCaseConfig {
  enabled: boolean;
  percentage: number;
  scenarios: EdgeCaseScenario[];
}

// ═══ Output Types ═══════════════════════════════════════════════════

export type OutputFormat = 'prisma-seed' | 'sql' | 'json' | 'csv' | 'factory' | 'mongodb';

export interface OutputConfig {
  formats: OutputFormat[];
  directory: string;
  prettify: boolean;
}

// ═══ Config Types ═══════════════════════════════════════════════════

export interface GeneratorConfig {
  version: string;
  schema: SchemaConfig;
  output: OutputConfig;
  generation: GenerationConfig;
  entities: Record<string, EntityConfig>;
  edgeCases: EdgeCaseConfig;
  ollama: OllamaConfig;
}

export interface SchemaConfig {
  type: SchemaSource;
  path: string;
}

export interface GenerationConfig {
  seed?: number;
  market: MarketRegion;
  language: 'vi' | 'en';
  locale: string;
}

export interface EntityConfig {
  count: number;
  distribution?: 'pareto' | 'uniform' | 'gaussian';
  overrides?: Record<string, FieldOverrideConfig>;
  temporal?: {
    field: string;
    distribution: 'business-hours' | 'uniform' | 'evening-peak';
  };
}

export interface FieldOverrideConfig {
  strategy: GenerationStrategy;
  template?: string;
  model?: string;
  prompt?: string;
  weights?: Record<string, number>;
}

export interface OllamaConfig {
  host: string;
  model: string;
  fallback: 'faker' | 'fail';
  temperature: number;
  concurrency: number;
}
