/**
 * Strategy Planner
 * Assigns generation strategy per field based on field name, type, and domain context
 * Determines: faker, ollama, distribution, domain-rule, constant, fk-lookup, auto-increment
 * 
 * CRITICAL: Primary key fields and UUID-like fields MUST use UUID strategy,
 * not faker.lorem.word(), to ensure referential integrity.
 */

import type {
  NormalizedSchema,
  NormalizedEntity,
  NormalizedField,
  DomainContext,
  FieldStrategy,
  EntityStrategy,
  StrategyPlan,
  GenerationStrategy,
  EdgeCaseConfig,
} from '../../types/index.js';

// ─── Common Enum Defaults ───────────────────────────────────────────

const COMMON_ENUM_DEFAULTS: Record<string, Record<string, number>> = {
  // Status fields
  status: { ACTIVE: 0.65, INACTIVE: 0.15, PENDING: 0.10, ARCHIVED: 0.10 },
  order_status: { COMPLETED: 0.65, PENDING: 0.15, PROCESSING: 0.10, CANCELLED: 0.07, REFUNDED: 0.03 },
  payment_status: { PAID: 0.70, PENDING: 0.15, FAILED: 0.10, REFUNDED: 0.05 },
  shipping_status: { DELIVERED: 0.60, SHIPPED: 0.15, PROCESSING: 0.10, PENDING: 0.10, RETURNED: 0.05 },
  
  // Role fields
  role: { CUSTOMER: 0.85, ADMIN: 0.10, MODERATOR: 0.05 },
  user_role: { CUSTOMER: 0.85, ADMIN: 0.10, MODERATOR: 0.05 },
  
  // Type fields
  type: { STANDARD: 0.60, PREMIUM: 0.25, ENTERPRISE: 0.15 },
  gender: { MALE: 0.49, FEMALE: 0.50, OTHER: 0.01 },
  
  // Priority fields
  priority: { LOW: 0.40, MEDIUM: 0.35, HIGH: 0.20, CRITICAL: 0.05 },
  
  // Category fields
  category: { ELECTRONICS: 0.30, CLOTHING: 0.25, FOOD: 0.20, HOME: 0.15, OTHER: 0.10 },
};

// ─── Semantic Field Name Detection ────────────────────────────────

const FIELD_PATTERNS: Array<{ pattern: RegExp; strategy: GenerationStrategy; params?: Record<string, unknown> }> = [
  // Internet
  { pattern: /email|e-mail|mail/i, strategy: 'faker', params: { fakerMethod: 'internet.email' } },
  { pattern: /url|website|link/i, strategy: 'faker', params: { fakerMethod: 'internet.url' } },
  
  // Vietnamese-specific (market=vietnam handled downstream)
  { pattern: /phone|mobile|tel|telephone|dien_thoai|so_dt/i, strategy: 'domain-rule', params: { rule: 'vietnamesePhone' } },
  { pattern: /^(full_?name|customer_?name|user_?name|display_?name|ho_ten|ten)$/i, strategy: 'domain-rule', params: { rule: 'vietnameseName' } },
  { pattern: /^(first_?name|given_?name)$/i, strategy: 'domain-rule', params: { rule: 'vietnameseGivenName' } },
  { pattern: /^(last_?name|family_?name|surname|ho)$/i, strategy: 'domain-rule', params: { rule: 'vietnameseSurname' } },
  { pattern: /address|dia_chi|addr|shipping_address|billing_address/i, strategy: 'domain-rule', params: { rule: 'vietnameseAddress' } },
  { pattern: /city|thanh_pho|province|tinh/i, strategy: 'domain-rule', params: { rule: 'vietnameseCity' } },
  { pattern: /cccd|cmnd|identity|id_card|so_cccd/i, strategy: 'domain-rule', params: { rule: 'vietnameseCCCD' } },
  
  // Status / role / type fields — use weighted distribution with common defaults
  { pattern: /^(status|trang_thai|state)$/i, strategy: 'distribution', params: { distribution: 'weighted' } },
  { pattern: /^(role|vai_tro)$/i, strategy: 'distribution', params: { distribution: 'weighted' } },
  { pattern: /^(type|loai|kind)$/i, strategy: 'distribution', params: { distribution: 'weighted' } },
  { pattern: /^(priority|do_uu_tien)$/i, strategy: 'distribution', params: { distribution: 'weighted' } },
  { pattern: /^(gender|gioi_tinh)$/i, strategy: 'distribution', params: { distribution: 'weighted' } },
  
  // Price / amount
  { pattern: /price|amount|gia|tong_tien|total_amount|unit_price/i, strategy: 'distribution', params: { distribution: 'logNormal' } },
  
  // Timestamps
  { pattern: /created_?at|ngay_tao/i, strategy: 'distribution', params: { distribution: 'business-hours' } },
  { pattern: /updated_?at|ngay_cap_nhat/i, strategy: 'distribution', params: { distribution: 'business-hours' } },
  
  // Text content (Ollama when available, Faker fallback)
  { pattern: /description|mo_ta|noi_dung/i, strategy: 'ollama', params: { prompt: 'description' } },
  { pattern: /content|body|review|binh_luan/i, strategy: 'ollama', params: { prompt: 'content' } },
  { pattern: /note|ghi_chu|remark/i, strategy: 'faker', params: { fakerMethod: 'lorem.sentence' } },
  
  // Title
  { pattern: /title|tieu_de/i, strategy: 'faker', params: { fakerMethod: 'lorem.words' } },
  
  // Quantity
  { pattern: /quantity|so_luong|qty/i, strategy: 'distribution', params: { distribution: 'exponential' } },
  
  // Totals
  { pattern: /total|tong$/i, strategy: 'faker', params: { fakerMethod: 'number.int' } },
];

export function assignStrategies(
  schema: NormalizedSchema,
  domain: DomainContext,
  entityConfigs: Record<string, unknown>,
  edgeCaseConfig: EdgeCaseConfig,
): StrategyPlan {
  const entities: EntityStrategy[] = [];

  for (const entity of schema.entities) {
    const config = entityConfigs[entity.name] as Record<string, unknown> | undefined;
    const count = typeof config?.['count'] === 'number' ? config['count'] as number : 100;

    const fieldStrategies: FieldStrategy[] = entity.fields.map(field => {
      // Check if user config has an override for this field
      const overrides = config?.['overrides'] as Record<string, unknown> | undefined;
      if (overrides && overrides[field.name]) {
        const override = overrides[field.name] as Record<string, unknown>;
        return {
          fieldName: field.name,
          entityName: entity.name,
          strategy: (override['strategy'] ?? 'faker') as GenerationStrategy,
          params: override['params'] as Record<string, unknown> | undefined,
        };
      }

      return inferFieldStrategy(field, entity, domain);
    });

    entities.push({
      entityName: entity.name,
      count,
      distribution: (config?.['distribution'] as string ?? 'pareto') as 'pareto' | 'uniform' | 'gaussian',
      temporal: config?.['temporal'] as EntityStrategy['temporal'],
      fieldStrategies,
    });
  }

  return {
    entities,
    edgeCases: edgeCaseConfig,
    domain,
  };
}

function inferFieldStrategy(field: NormalizedField, entity: NormalizedEntity, domain: DomainContext): FieldStrategy {
  // ─── CRITICAL: Primary key fields always get UUID ───
  if (field.name === entity.primaryKey) {
    if (field.type === 'uuid' || field.type === 'string') {
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'string.uuid' } };
    }
    if (field.isAutoIncrement) {
      return { fieldName: field.name, entityName: entity.name, strategy: 'auto-increment' };
    }
    if (field.type === 'int') {
      return { fieldName: field.name, entityName: entity.name, strategy: 'auto-increment' };
    }
    return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'string.uuid' } };
  }

  // ─── Auto-increment fields ───
  if (field.isAutoIncrement) {
    return { fieldName: field.name, entityName: entity.name, strategy: 'auto-increment' };
  }

  // ─── Foreign key fields ───
  if (field.isForeignKey) {
    return {
      fieldName: field.name,
      entityName: entity.name,
      strategy: 'fk-lookup',
      params: {
        referencedEntity: field.referencedEntity,
        referencedField: field.referencedField ?? 'id',
      },
    };
  }

  // ─── UUID-typed fields (but not PK, already handled above) ───
  if (field.type === 'uuid') {
    return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'string.uuid' } };
  }

  // ─── String fields that look like IDs (name ends with _id or Id) ───
  if (field.type === 'string' && (field.name.endsWith('_id') || field.name.endsWith('Id') || field.name === 'id')) {
    return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'string.uuid' } };
  }

  // ─── VARCHAR(36) fields are likely UUIDs ───
  if (field.type === 'string' && field.maxLength === 36) {
    return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'string.uuid' } };
  }

  // ─── Unique string fields ───
  if (field.isUnique && field.type === 'string' && !field.name.toLowerCase().includes('email')) {
    return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'string.uuid' } };
  }

  // ─── Enum fields ───
  if (field.type === 'enum' && field.enumValues && field.enumValues.length > 0) {
    return {
      fieldName: field.name,
      entityName: entity.name,
      strategy: 'distribution',
      params: {
        distribution: 'weighted',
        values: field.enumValues,
        weights: field.enumValues.reduce((acc, v, i) => {
          // Equal distribution by default, but first value gets slightly more weight
          acc[v] = i === 0 ? 2 : 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  // ─── Semantic field name detection ───
  for (const { pattern, strategy, params } of FIELD_PATTERNS) {
    if (pattern.test(field.name)) {
      // For status/role/type fields, add common defaults if no enum values
      if (strategy === 'distribution' && params?.['distribution'] === 'weighted') {
        const fieldNameLower = field.name.toLowerCase();
        // Try entity_field pattern (e.g., order_status)
        const entityFieldKey = entity.name.toLowerCase() + '_' + fieldNameLower;
        const defaults = COMMON_ENUM_DEFAULTS[entityFieldKey] ?? COMMON_ENUM_DEFAULTS[fieldNameLower];
        
        if (defaults) {
          return {
            fieldName: field.name,
            entityName: entity.name,
            strategy: 'distribution',
            params: {
              distribution: 'weighted',
              weights: defaults,
            },
          };
        }
      }
      
      return { fieldName: field.name, entityName: entity.name, strategy, params };
    }
  }

  // ─── Type-based defaults ───
  switch (field.type) {
    case 'string':
      if (field.isNullable) {
        return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'lorem.words' } };
      }
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'lorem.word' } };
    case 'int':
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'number.int' } };
    case 'float':
    case 'decimal':
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'number.float' } };
    case 'boolean':
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'datatype.boolean' } };
    case 'datetime':
    case 'date':
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'date.recent' } };
    case 'json':
      return { fieldName: field.name, entityName: entity.name, strategy: 'constant', params: { value: {} } };
    case 'bytes':
      return { fieldName: field.name, entityName: entity.name, strategy: 'constant', params: { value: '' } };
    default:
      return { fieldName: field.name, entityName: entity.name, strategy: 'faker', params: { fakerMethod: 'lorem.word' } };
  }
}
