# PROJECT-detail.md — vibe-mock-data-generator-agent

**Full Technical Specification**
Version: 1.0.0 | Last Updated: 2025-06
Status: Pre-Development → Design Finalized

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Schema Parser Specifications](#4-schema-parser-specifications)
5. [Dependency Resolution Engine](#5-dependency-resolution-engine)
6. [Generation Strategy Engine](#6-generation-strategy-engine)
7. [Vietnamese Data Generation](#7-vietnamese-data-generation)
8. [Statistical Distribution Engine](#8-statistical-distribution-engine)
9. [Edge Case Generation](#9-edge-case-generation)
10. [Output Formatters](#10-output-formatters)
11. [Ollama Integration](#11-ollama-integration)
12. [Data Flow (E2E)](#12-data-flow-e2e)
13. [Self-Learning Knowledge System](#13-self-learning-knowledge-system)
14. [Performance Targets](#14-performance-targets)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Success Metrics](#16-success-metrics)

---

## 1. Project Overview

### 1.1 Name & Tagline
**vibe-mock-data-generator-agent** — *"Trợ lý tự động hóa dữ liệu kiểm thử thực tế"*
Stop seeding your database with `user@user.com`. Generate test data that actually catches bugs.

### 1.2 The Core Value Proposition

Production bugs often appear because:
1. Test data is too clean (every field filled, every status "active", every amount non-zero)
2. Test data lacks cultural specificity (generic English names in a Vietnamese-market product)
3. Test data ignores relationships (orders with non-existent customers)
4. Test data has unrealistic distributions (test with 10 users; fail with 10 million)

This agent generates data that is **statistically realistic**, **culturally appropriate**, **referentially valid**, and **rich with edge cases** — automatically, from your existing schema.

### 1.3 Differentiation from Existing Tools

| Tool | Gap |
|------|-----|
| `faker.js` alone | Generates fields independently, no relationship awareness, no business logic |
| `prisma-test-utils` | Only supports Prisma, no statistical distributions, no Vietnamese locale |
| `@snaplet/seed` | Cloud-based (sends schema to their servers), subscription cost, no Ollama |
| Hand-written seeds | Slow to maintain, rarely updated, never has edge cases |
| `factory-bot` (Ruby/Python) | Not schema-driven, requires manual factory definition for every model |

**This agent's unique position**: Schema-driven + relationship-aware + Vietnamese-native + local SLM for realistic text + statistical distributions + edge case injection + multiple output formats.

---

## 2. Problem Statement

### 2.1 The "User1 Problem"

```typescript
// What most Vibe Coders actually seed:
const users = [
  { id: 1, name: "User 1", email: "user1@test.com", role: "admin" },
  { id: 2, name: "User 2", email: "user2@test.com", role: "user" },
];

const products = [
  { id: 1, name: "Product 1", price: 100, status: "active" },
  { id: 2, name: "Product 2", price: 200, status: "active" },
];

// Every order is completed, every user is active, every name is "User N"
```

**What bugs this misses**:
- Vietnamese name rendering (Nguyễn Thị Bích Phượng vs just Bich Phuong)
- Empty cart checkout flow (0-item orders)
- Cancelled order refund calculation
- Admin user with no orders (admin doesn't shop)
- Products with 0 stock but still "active"
- Users registered but never verified

### 2.2 The Schema Complexity Challenge

A real e-commerce schema has 20-40 tables with complex relationships:
```
User → Order → OrderItem → Product → Category
             → Address
             → Payment → PaymentMethod
User → Cart → CartItem → Product
User → Review → Product
Product → ProductVariant → InventoryItem
```

Manually writing seed data for this is:
- Time-consuming (3-5 days for a thorough seed)
- Fragile (schema changes require seed updates)
- Incomplete (rarely covers all relationship combinations)

### 2.3 The Vietnamese Context Gap

Most data generation libraries have minimal Vietnamese locale support:
- `faker.js vi` locale: limited, missing many realistic patterns
- No Vietnamese administrative division data (phường/xã level)
- No Vietnamese CCCD format awareness
- No Ollama-based Vietnamese contextual text generation

---

## 3. Solution Architecture

### 3.1 High-Level Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INPUT                                         │
│  Schema file  │  Config YAML  │  CLI flags  │  Interactive mode      │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│                  SCHEMA PARSER                                        │
│  → Parse schema file (Prisma/DDL/TypeORM/JSON Schema)               │
│  → Extract: entities, fields, types, constraints, relations         │
│  → Output: NormalizedSchema (database-agnostic)                     │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│              DOMAIN DETECTOR (Claude API — one-time)                 │
│  → Analyze schema semantics                                          │
│  → Detect: business domain, market (VN/global), entity purposes     │
│  → Output: DomainContext with generation hints per table             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│              DEPENDENCY RESOLVER                                      │
│  → Build entity dependency graph (foreign key graph)                │
│  → Topological sort (Kahn's algorithm)                              │
│  → Output: Ordered list of tables to seed                           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│              STRATEGY PLANNER                                         │
│  → Assign generation strategy per field                              │
│  → faker / ollama / distribution / domain-rule / constant           │
│  → Assign statistical distribution per entity                       │
│  → Plan edge case injection                                          │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│                DATA GENERATOR                                         │
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐ │
│  │ Faker Engine   │  │ Ollama Engine  │  │ Distribution Engine     │ │
│  │ (80% fields)   │  │ (15% fields)   │  │ (status/timing/amount)  │ │
│  └───────┬────────┘  └───────┬────────┘  └───────────┬─────────────┘ │
│          └──────────────┬────┘                        │               │
│                         └────────────────┬────────────┘               │
│                                          ▼                            │
│                       Integrity Validator (post-check)                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                  EDGE CASE INJECTOR                                   │
│  → Inject configured % of edge case records                         │
│  → NULL values, boundaries, unicode, status edge cases              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                  OUTPUT FORMATTER                                     │
│  prisma-seed  │  SQL  │  JSON  │  CSV  │  factory-functions          │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 The NormalizedSchema Data Structure

```typescript
interface NormalizedSchema {
  entities: NormalizedEntity[];
  relations: Relation[];
  enums: EnumDefinition[];
  source: 'prisma' | 'ddl' | 'typeorm' | 'jsonschema';
}

interface NormalizedEntity {
  name: string;              // "User", "Order", "Product"
  tableName: string;         // "users", "orders", "products"
  fields: NormalizedField[];
  primaryKey: string;        // field name
  indexes: Index[];
}

interface NormalizedField {
  name: string;
  type: FieldType;           // 'string' | 'int' | 'float' | 'boolean' | 'datetime' | 'uuid' | 'enum' | 'json'
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

interface Relation {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  junctionTable?: string;    // For many-to-many
  isRequired: boolean;
  cascadeDelete: boolean;
}
```

---

## 4. Schema Parser Specifications

### 4.1 Prisma Parser

**Approach**: Use `@prisma/internals` to get the DMMF (Data Model Meta Format) — the official programmatic representation of a Prisma schema.

```typescript
import { getDMMF } from '@prisma/internals';

async function parsePrismaSchema(schemaPath: string): Promise<NormalizedSchema> {
  const schemaText = await fs.readFile(schemaPath, 'utf-8');
  const dmmf = await getDMMF({ datamodel: schemaText });
  
  const entities = dmmf.datamodel.models.map(model => ({
    name: model.name,
    tableName: model.dbName ?? toSnakeCase(model.name),
    fields: model.fields
      .filter(f => f.kind !== 'object')  // Exclude relation fields (not DB columns)
      .map(parseField),
    primaryKey: model.fields.find(f => f.isId)?.name ?? 'id',
    indexes: model.uniqueFields.map(parseIndex),
  }));
  
  const relations = extractRelations(dmmf.datamodel.models);
  const enums = dmmf.datamodel.enums.map(e => ({
    name: e.name,
    values: e.values.map(v => v.name),
  }));
  
  return { entities, relations, enums, source: 'prisma' };
}
```

**Sample Prisma Schema → NormalizedSchema:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  phone     String?
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  orders    Order[]
}

enum Role {
  CUSTOMER
  ADMIN
  MODERATOR
}
```

Produces:
```typescript
{
  name: "User",
  tableName: "users",
  fields: [
    { name: "id", type: "uuid", isRequired: true, isAutoIncrement: false, isUnique: true },
    { name: "email", type: "string", isRequired: true, isUnique: true },
    { name: "name", type: "string", isRequired: true },
    { name: "phone", type: "string", isRequired: false, isNullable: true },
    { name: "role", type: "enum", enumValues: ["CUSTOMER", "ADMIN", "MODERATOR"], defaultValue: "CUSTOMER" },
    { name: "createdAt", type: "datetime", isRequired: false, defaultValue: "now()" },
  ]
}
```

### 4.2 SQL DDL Parser

```typescript
import { parse as parsePgSql } from 'pgsql-ast-parser';

function parseDDL(ddlText: string, dialect: 'postgres' | 'mysql'): NormalizedSchema {
  const ast = parsePgSql(ddlText);
  
  const entities = ast
    .filter(stmt => stmt.type === 'create table')
    .map(parseCreateTableStatement);
  
  const relations = extractForeignKeyRelations(ast);
  
  return { entities, relations, enums: [], source: 'ddl' };
}
```

### 4.3 TypeORM Entity Parser

Use TypeScript AST (via `ts-morph`) to parse decorators:
```typescript
// Parse: @Column(), @PrimaryGeneratedColumn(), @ManyToOne(), etc.
import { Project } from 'ts-morph';

function parseTypeORMEntities(entityPaths: string[]): NormalizedSchema {
  const project = new Project();
  entityPaths.forEach(p => project.addSourceFileAtPath(p));
  
  const entities = project.getSourceFiles().flatMap(file =>
    file.getClasses()
      .filter(c => c.getDecorator('Entity'))
      .map(parseEntityClass)
  );
  
  return { entities, relations: extractRelations(entities), enums: [], source: 'typeorm' };
}
```

---

## 5. Dependency Resolution Engine

### 5.1 Topological Sort (Kahn's Algorithm)

The seed order must respect foreign key constraints:
- `orders` depends on `users` and `products`
- `order_items` depends on `orders` and `products`
- `reviews` depends on `users` and `products`

```typescript
function resolveGenerationOrder(schema: NormalizedSchema): string[] {
  // Build adjacency list: entity → entities it depends on
  const dependsOn = new Map<string, Set<string>>();
  
  for (const entity of schema.entities) {
    dependsOn.set(entity.name, new Set());
  }
  
  for (const relation of schema.relations) {
    if (relation.type === 'one-to-many') {
      // "many" side (the FK owner) depends on "one" side
      dependsOn.get(relation.from.entity)?.add(relation.to.entity);
    } else if (relation.type === 'many-to-many') {
      // Junction table depends on both parent tables
      if (relation.junctionTable) {
        dependsOn.set(relation.junctionTable, new Set([
          relation.from.entity,
          relation.to.entity
        ]));
      }
    }
  }
  
  // Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const [entity] of dependsOn) {
    inDegree.set(entity, 0);
  }
  for (const [, deps] of dependsOn) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }
  
  const queue = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([entity]) => entity);
  
  const result: string[] = [];
  while (queue.length > 0) {
    const entity = queue.shift()!;
    result.push(entity);
    
    for (const [dependent, deps] of dependsOn) {
      if (deps.has(entity)) {
        const newDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) queue.push(dependent);
      }
    }
  }
  
  if (result.length !== schema.entities.length) {
    throw new CircularDependencyError(findCycle(dependsOn));
  }
  
  return result;
}
```

### 5.2 Self-Referential Relation Handling

For entities like `Employee.managerId → Employee.id` or `Category.parentId → Category.id`:

```typescript
function handleSelfReferentialRelation(
  entity: string,
  generatedRecords: GeneratedRecord[]
): void {
  // Strategy: first batch has null for self-reference
  // subsequent batches can reference earlier records
  
  const total = generatedRecords.length;
  generatedRecords.forEach((record, index) => {
    if (index === 0) {
      record.managerId = null;  // Root/top-level record
    } else {
      // Reference a random earlier record (creates a realistic tree)
      const parentIndex = faker.number.int({ min: 0, max: index - 1 });
      record.managerId = generatedRecords[parentIndex].id;
    }
  });
}
```

---

## 6. Generation Strategy Engine

### 6.1 Field-to-Strategy Mapping

The strategy planner assigns a generation strategy to each field based on:
1. Field name patterns (semantic inference)
2. Field type
3. Constraints (UNIQUE, NOT NULL, FK)
4. Domain context from domain detector

```typescript
function assignStrategy(
  field: NormalizedField,
  entity: string,
  domain: DomainContext
): GenerationStrategy {
  
  // 1. Primary key: always UUID or autoincrement (skip generation)
  if (field.isAutoIncrement) return { type: 'autoincrement' };
  if (field.name === 'id' && field.type === 'uuid') return { type: 'uuid' };
  
  // 2. Foreign keys: resolved from parent pool
  if (field.isForeignKey) return { type: 'foreign-key-lookup', entity: field.referencedEntity! };
  
  // 3. Timestamps
  if (field.name.match(/createdAt|created_at|createdOn/)) return { type: 'past-date', range: '2-years' };
  if (field.name.match(/updatedAt|updated_at/)) return { type: 'past-date', relative: 'after:createdAt' };
  if (field.name.match(/deletedAt|deleted_at/)) return { type: 'nullable-past-date', probability: 0.05 };
  
  // 4. Enum fields
  if (field.type === 'enum') return { type: 'weighted-enum', values: field.enumValues! };
  
  // 5. Boolean flags
  if (field.type === 'boolean') {
    if (field.name.match(/is_active|isActive|active/)) return { type: 'weighted-boolean', trueWeight: 0.90 };
    if (field.name.match(/is_verified|isVerified|verified/)) return { type: 'weighted-boolean', trueWeight: 0.75 };
    return { type: 'weighted-boolean', trueWeight: 0.50 };
  }
  
  // 6. Semantic field name recognition
  const semanticStrategy = detectSemanticField(field.name, domain);
  if (semanticStrategy) return semanticStrategy;
  
  // 7. Default by type
  return defaultStrategyForType(field.type, field.maxLength);
}

function detectSemanticField(fieldName: string, domain: DomainContext): GenerationStrategy | null {
  const lowerName = fieldName.toLowerCase();
  
  // Identity fields
  if (lowerName.match(/email/)) return { type: 'faker', method: 'internet.email' };
  if (lowerName.match(/phone|dien_thoai|sdt/)) return viPhoneStrategy();
  if (lowerName.match(/name|ten/) && !lowerName.match(/username/)) return viNameStrategy(domain);
  if (lowerName.match(/address|dia_chi/)) return viAddressStrategy();
  if (lowerName.match(/avatar|photo|image.*url/)) return { type: 'faker', method: 'image.avatar' };
  
  // Financial
  if (lowerName.match(/price|gia|amount|so_tien/)) return viPriceStrategy(domain);
  if (lowerName.match(/quantity|so_luong|qty/)) return { type: 'distribution', dist: 'exponential', mean: 2 };
  
  // Content fields (→ Ollama for contextual text)
  if (lowerName.match(/description|mo_ta|noi_dung/) && domain.usesOllama) {
    return { type: 'ollama', prompt: domain.descriptionPrompt };
  }
  if (lowerName.match(/note|ghi_chu|comment|review|nhan_xet/) && domain.usesOllama) {
    return { type: 'ollama', prompt: domain.commentPrompt };
  }
  
  // Short content (Faker is fine)
  if (lowerName.match(/title|tieu_de|name/)) return { type: 'faker', method: 'lorem.words', args: [3, 6] };
  
  return null;
}
```

### 6.2 Strategy Priority Matrix

| Field Type | Name Pattern | Strategy | Notes |
|-----------|-------------|---------|-------|
| String | `*email*` | Faker email | Unique enforcement |
| String | `*phone*` | Vietnamese phone | 09x/03x/07x/08x |
| String | `*name*`, `*ten*` | Vietnamese name | via locale data |
| String | `*address*`, `*dia_chi*` | Vietnamese address | Full hierarchical |
| String | `*description*`, `*mo_ta*` | Ollama (if enabled) | Contextual text |
| String | `*note*`, `*comment*` | Ollama (if short ≤ 200 chars: Faker lorem) | Depends on length |
| String | `*url*`, `*link*` | Faker URL | Domain-appropriate |
| String | `*slug*` | Faker slug | Derived from name field |
| Int/Float | `*price*`, `*gia*` | Distribution + domain pricing | VND amounts |
| Int/Float | `*quantity*`, `*count*` | Exponential distribution | Most are small |
| DateTime | `*created_at*` | Past date (uniform) | |
| DateTime | `*deleted_at*` | Null (95%) or past date (5%) | |
| Boolean | `*active*`, `*enabled*` | Weighted (90% true) | |
| Enum | Any | Weighted per status logic | |
| UUID | Any pk | `crypto.randomUUID()` | |
| JSON | Any | Domain-specific JSON template | |

---

## 7. Vietnamese Data Generation

### 7.1 Vietnamese Name Generation

```typescript
// Data: src/data/vietnamese/
// surnames.json: 100+ common Vietnamese họ (Nguyễn, Trần, Lê, Phạm, Hoàng...)
// given-names-female.json: 500+ female given names
// given-names-male.json: 500+ male given names  
// middle-names.json: common Vietnamese middle name particles

function generateVietnameseName(gender: 'male' | 'female' | 'random' = 'random'): string {
  const g = gender === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;
  
  const surname = pickWeighted(surnames);          // Nguyễn (38.4% probability, most common)
  const middleName = pickWeighted(middleNames);    // Thị (for female), Văn (for male)
  const givenName = pickRandom(givenNames[g]);     // Bích Phượng, Tuấn Anh, etc.
  
  return `${surname} ${middleName} ${givenName}`;  // Nguyễn Thị Bích Phượng
}

// Surname frequency distribution (realistic Vietnamese demographics)
const surnames = [
  { value: "Nguyễn", weight: 384 },  // ~38.4% of Vietnamese population
  { value: "Trần",   weight: 111 },
  { value: "Lê",     weight: 98 },
  { value: "Phạm",   weight: 74 },
  { value: "Hoàng",  weight: 54 },
  { value: "Huỳnh",  weight: 52 },   // Common in South Vietnam
  { value: "Phan",   weight: 45 },
  { value: "Vũ",     weight: 38 },
  { value: "Võ",     weight: 35 },
  { value: "Đặng",   weight: 27 },
  // ... 90+ more
];
```

### 7.2 Vietnamese Phone Number Generation

```typescript
function generateVietnamesePhone(): string {
  // Vietnamese mobile phone number prefixes (as of 2024):
  const prefixes = {
    viettel: ['032', '033', '034', '035', '036', '037', '038', '039', '086', '096', '097', '098'],
    mobifone: ['070', '076', '077', '078', '079', '089', '090', '093'],
    vinaphone: ['081', '082', '083', '084', '085', '088', '091', '094'],
    vietnamobile: ['052', '056', '058', '092'],
    gmobile: ['059', '099'],
    reddi: ['055', '056'],
  };
  
  const allPrefixes = Object.values(prefixes).flat();
  const prefix = faker.helpers.arrayElement(allPrefixes);
  const suffix = faker.string.numeric(7);
  
  return `${prefix}${suffix}`;  // e.g., "0912345678"
}
```

### 7.3 Vietnamese Address Generation

```typescript
interface VietnameseAddress {
  streetNumber: string;   // "123"
  streetName: string;     // "Nguyễn Huệ"
  ward: string;           // "Phường Bến Nghé"
  district: string;       // "Quận 1"
  city: string;           // "Thành phố Hồ Chí Minh"
  postalCode: string;     // "700000"
  fullAddress: string;    // Combined
}

function generateVietnameseAddress(city?: string): VietnameseAddress {
  // Population-weighted city selection if no city specified
  const selectedCity = city ?? pickWeightedCity();
  
  const cityData = vietnameseAddressData[selectedCity];
  const district = faker.helpers.arrayElement(cityData.districts);
  const ward = faker.helpers.arrayElement(district.wards);
  const street = faker.helpers.arrayElement(district.streets);
  const streetNumber = faker.number.int({ min: 1, max: 500 }).toString();
  
  const fullAddress = `${streetNumber} ${street}, ${ward.name}, ${district.name}, ${selectedCity}`;
  
  return {
    streetNumber,
    streetName: street,
    ward: ward.name,
    district: district.name,
    city: selectedCity,
    postalCode: ward.postalCode,
    fullAddress,
  };
}

// City population weights for realistic geographic distribution
const cityWeights = [
  { city: "Thành phố Hồ Chí Minh", weight: 930 },  // ~9.3M population
  { city: "Hà Nội", weight: 830 },
  { city: "Đà Nẵng", weight: 120 },
  { city: "Hải Phòng", weight: 110 },
  { city: "Cần Thơ", weight: 120 },
  { city: "Biên Hòa", weight: 110 },
  { city: "Bình Dương", weight: 130 },
  // ... all 63 provinces
];
```

### 7.4 Vietnamese CCCD (Citizen ID) Generation

```typescript
function generateVietnameseCCCD(): string {
  // CCCD format: 12 digits
  // First 3 digits: province code (001-096)
  // Next 1 digit: gender (0=male, 1=female) century bit
  // Next 2 digits: birth year last 2 digits
  // Last 6 digits: sequential number
  
  // Using FAKE province codes (900-999) to ensure these are clearly test data
  const fakeProvinceCode = faker.number.int({ min: 900, max: 999 }).toString();
  const genderCentury = faker.helpers.arrayElement(['0', '1', '2', '3']);
  const birthYear = faker.number.int({ min: 70, max: 05 }).toString().padStart(2, '0');
  const sequential = faker.string.numeric(6);
  
  return `${fakeProvinceCode}${genderCentury}${birthYear}${sequential}`;
}
```

### 7.5 Vietnamese Price Generation (VND)

```typescript
function generateVNDPrice(domain: string, tier: 'budget' | 'mid' | 'premium' = 'mid'): number {
  const priceRanges = {
    food: {
      budget:  { min: 15_000,     max: 50_000 },    // Street food
      mid:     { min: 50_000,     max: 200_000 },   // Restaurant
      premium: { min: 200_000,    max: 1_000_000 }, // Fine dining
    },
    fashion: {
      budget:  { min: 50_000,     max: 200_000 },
      mid:     { min: 200_000,    max: 1_000_000 },
      premium: { min: 1_000_000,  max: 10_000_000 },
    },
    electronics: {
      budget:  { min: 500_000,    max: 2_000_000 },
      mid:     { min: 2_000_000,  max: 10_000_000 },
      premium: { min: 10_000_000, max: 50_000_000 },
    },
    ecommerce: {
      budget:  { min: 10_000,     max: 500_000 },
      mid:     { min: 500_000,    max: 5_000_000 },
      premium: { min: 5_000_000,  max: 50_000_000 },
    },
  };
  
  const range = priceRanges[domain]?.[tier] ?? priceRanges.ecommerce[tier];
  
  // Round to nearest 1000 VND (common Vietnamese pricing)
  const rawPrice = faker.number.int(range);
  return Math.round(rawPrice / 1000) * 1000;
}
```

---

## 8. Statistical Distribution Engine

### 8.1 User Activity Distribution (Pareto 80/20)

```typescript
function assignActivityLevel(userIndex: number, totalUsers: number): UserActivityLevel {
  // Pareto: top 20% of users generate 80% of activity
  const percentile = userIndex / totalUsers;
  
  if (percentile < 0.02) return 'whale';        // 2% → super heavy users (50+ orders)
  if (percentile < 0.20) return 'heavy';        // 18% → heavy users (10-50 orders)
  if (percentile < 0.50) return 'moderate';     // 30% → moderate users (3-9 orders)
  if (percentile < 0.80) return 'light';        // 30% → light users (1-2 orders)
  return 'dormant';                             // 20% → registered but never ordered
}

const orderCountByLevel = {
  whale:    () => faker.number.int({ min: 50,  max: 200 }),
  heavy:    () => faker.number.int({ min: 10,  max: 50 }),
  moderate: () => faker.number.int({ min: 3,   max: 9 }),
  light:    () => faker.number.int({ min: 1,   max: 2 }),
  dormant:  () => 0,
};
```

### 8.2 Temporal Distribution (Business Hours Clustering)

```typescript
function generateRealisticTimestamp(
  distribution: 'business-hours' | 'uniform' | 'evening-peak',
  dateRange: { from: Date; to: Date }
): Date {
  
  const baseDate = faker.date.between(dateRange);
  
  switch (distribution) {
    case 'business-hours': {
      // Cluster around 9am-6pm on weekdays
      const isWeekday = baseDate.getDay() > 0 && baseDate.getDay() < 6;
      const hour = isWeekday
        ? weightedHour([  // Probability weights for each hour 0-23
            0, 0, 0, 0, 0, 1, 2, 4,   // 0-7: low, starts rising at 6
            8, 15, 18, 20, 18, 15, 16, 18,  // 8-15: business peak
            20, 18, 12, 8, 5, 3, 2, 1  // 16-23: evening drop
          ])
        : weightedHour([
            0, 0, 0, 0, 0, 0, 1, 2,   // Weekend morning: slower start
            5, 10, 15, 18, 20, 18, 15, 12,
            10, 15, 18, 15, 12, 8, 5, 2  // Weekend evening: higher peak
          ]);
      
      baseDate.setHours(hour, faker.number.int(59), faker.number.int(59));
      return baseDate;
    }
    
    case 'evening-peak': {
      // E-commerce: peak 7pm-10pm
      const hour = weightedHour([
        0, 0, 0, 0, 0, 0, 1, 1, 2, 4, 6, 8, 10, 8, 7, 8, 10, 14, 20, 22, 18, 12, 8, 4
      ]);
      baseDate.setHours(hour, faker.number.int(59), faker.number.int(59));
      return baseDate;
    }
    
    default:
      return baseDate;
  }
}
```

### 8.3 Order Status Distribution with State Machine Awareness

```typescript
// NOT just random status assignment — status depends on creation time
function generateOrderStatus(createdAt: Date): OrderStatus {
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  if (ageInDays < 0.1) {
    // Orders created in last 2.4 hours: mostly pending
    return weightedRandom({ PENDING: 0.70, PROCESSING: 0.25, CANCELLED: 0.05 });
  } else if (ageInDays < 3) {
    // Orders 0-3 days old: processing to shipped
    return weightedRandom({ PROCESSING: 0.40, SHIPPED: 0.35, COMPLETED: 0.15, CANCELLED: 0.10 });
  } else if (ageInDays < 30) {
    // Orders 3-30 days old: mostly completed/shipped
    return weightedRandom({ COMPLETED: 0.70, SHIPPED: 0.10, CANCELLED: 0.12, REFUNDED: 0.08 });
  } else {
    // Old orders: mostly completed
    return weightedRandom({ COMPLETED: 0.82, CANCELLED: 0.10, REFUNDED: 0.08 });
  }
}
```

---

## 9. Edge Case Generation

### 9.1 Edge Case Categories

```typescript
const EDGE_CASE_SCENARIOS = {
  
  // String edge cases
  maxLengthString: (maxLength: number) => 'a'.repeat(maxLength),
  emptyString: () => '',
  unicodeName: () => faker.helpers.arrayElement([
    'Nguyễn Thị Ḿơ',   // Name with unusual diacritics
    'José García López',   // Latin extended
    '田中 太郎',            // East Asian characters
    'محمد علي',            // Arabic RTL
  ]),
  
  // Numeric edge cases
  zeroAmount: () => 0,
  negativeAmount: () => -faker.number.int({ min: 1, max: 1000 }),
  maxSafeInteger: () => Number.MAX_SAFE_INTEGER,
  decimalPrecision: () => 0.1 + 0.2, // 0.30000000000000004
  
  // Date edge cases
  leapYearDate: () => new Date('2024-02-29'),
  yearBoundary: () => new Date('2024-12-31T23:59:59.999Z'),
  farFutureDate: () => new Date('2099-12-31'),
  epochDate: () => new Date(0),
  
  // Status edge cases
  deletedActiveRecord: (record: any) => ({
    ...record,
    isActive: true,
    deletedAt: new Date(),   // Both active AND deleted
  }),
  
  // Relationship edge cases (for testing CASCADE behavior)
  orphanedRecord: null,  // FK without corresponding parent (violates FK — test with FK disabled)
};
```

### 9.2 Edge Case Injection Strategy

```typescript
function injectEdgeCases(
  records: GeneratedRecord[],
  entity: NormalizedEntity,
  edgeCaseConfig: EdgeCaseConfig
): GeneratedRecord[] {
  
  const edgeCaseCount = Math.floor(records.length * edgeCaseConfig.percentage);
  const edgeCaseIndices = new Set(
    faker.helpers.arrayElements(
      Array.from({ length: records.length }, (_, i) => i),
      edgeCaseCount
    )
  );
  
  return records.map((record, index) => {
    if (!edgeCaseIndices.has(index)) return record;
    
    // Apply a random edge case scenario to this record
    const scenario = faker.helpers.arrayElement(edgeCaseConfig.scenarios);
    return applyEdgeCaseScenario(record, entity, scenario);
  });
}
```

---

## 10. Output Formatters

### 10.1 Prisma Seed Script

```typescript
function formatPrismaSeed(
  generatedData: Map<string, GeneratedRecord[]>,
  seedOrder: string[]
): string {
  
  return `
// @generated-mock-data — DO NOT USE IN PRODUCTION
// Generated: ${new Date().toISOString()}
// Records: ${getTotalRecordCount(generatedData)}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Clean existing data (in reverse dependency order)
  ${generateDeleteStatements(seedOrder.reverse())}
  
  // Seed in dependency order
  ${seedOrder.reverse().map(entity => generateEntitySeed(entity, generatedData.get(entity)!)).join('\n\n')}
  
  console.log('✅ Database seeded successfully');
  console.log('📊 Statistics:');
  ${generateStatsSummary(generatedData)}
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
`.trim();
}

function generateEntitySeed(entity: string, records: GeneratedRecord[]): string {
  return `
  // ${entity}: ${records.length} records
  await prisma.${toCamelCase(entity)}.createMany({
    data: ${JSON.stringify(records, null, 2)},
    skipDuplicates: true,
  });
  console.log('  ✓ ${entity}: ${records.length} records');`.trim();
}
```

**Example generated output:**
```typescript
// @generated-mock-data — DO NOT USE IN PRODUCTION
// Generated: 2025-06-01T10:30:00.000Z
// Records: 6,550 total

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // User: 500 records
  await prisma.user.createMany({
    data: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "nguyen.thi.bich.phuong@example.com",
        name: "Nguyễn Thị Bích Phượng",
        phone: "0912345678",
        role: "CUSTOMER",
        createdAt: new Date("2023-07-15T09:23:11.000Z"),
      },
      // ... 499 more
    ],
    skipDuplicates: true,
  });
  // ...
}
```

### 10.2 Factory Functions Output

```typescript
function formatFactoryFunctions(
  entity: NormalizedEntity,
  domainContext: DomainContext
): string {
  
  return `
// Factory functions for ${entity.name}
// Usage: const user = createUser({ role: 'ADMIN' });
//        const users = createUsers(50);

import { faker } from '@faker-js/faker/locale/vi';

type ${entity.name}Override = Partial<{
  ${entity.fields.map(f => `${f.name}: ${tsType(f.type)}`).join('\n  ')}
}>;

export function create${entity.name}(overrides: ${entity.name}Override = {}): ${entity.name} {
  return {
    id: faker.string.uuid(),
    ${entity.fields
      .filter(f => !f.isAutoIncrement && f.name !== 'id')
      .map(f => `${f.name}: ${defaultFakerExpression(f, domainContext)},`)
      .join('\n    ')}
    ...overrides,
  };
}

export function create${entity.name}s(
  count: number,
  overrides: ${entity.name}Override = {}
): ${entity.name}[] {
  return Array.from({ length: count }, () => create${entity.name}(overrides));
}

// Specialized factories for common test scenarios
export const ${entity.name}Factory = {
  active: (o?: ${entity.name}Override) => create${entity.name}({ isActive: true, ...o }),
  inactive: (o?: ${entity.name}Override) => create${entity.name}({ isActive: false, ...o }),
  withEdgeCases: (o?: ${entity.name}Override) => create${entity.name}({ 
    name: 'Nguyễn Thị Ḿơ',  // Unicode edge case
    ...o 
  }),
};
`.trim();
}
```

---

## 11. Ollama Integration

### 11.1 Ollama Client

```typescript
// src/ml/ollama-client.ts

interface OllamaConfig {
  host: string;           // default: 'http://localhost:11434'
  model: string;          // default: 'llama3.1:8b'
  temperature: number;    // default: 0.8 (creative, varied)
  fallbackToFaker: boolean; // default: true
}

class OllamaClient {
  private isAvailable: boolean | null = null;
  
  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) return this.isAvailable;
    
    try {
      const response = await fetch(`${this.config.host}/api/tags`, { signal: AbortSignal.timeout(2000) });
      this.isAvailable = response.ok;
    } catch {
      this.isAvailable = false;
      if (!this.config.fallbackToFaker) {
        throw new Error('Ollama not available. Start Ollama or set fallbackToFaker: true');
      }
      console.warn('⚠️  Ollama not available — falling back to Faker for text generation');
    }
    
    return this.isAvailable;
  }
  
  async generateBatch(
    prompts: string[],
    options: { concurrency?: number } = {}
  ): Promise<string[]> {
    
    if (!await this.checkAvailability()) {
      return prompts.map(() => faker.lorem.paragraph(2));
    }
    
    const concurrency = options.concurrency ?? 3;  // 3 concurrent Ollama requests
    const results: string[] = [];
    
    // Process in batches of `concurrency`
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(prompt => this.generateSingle(prompt))
      );
      results.push(...batchResults);
      
      // Show progress for large batches
      if (prompts.length > 100) {
        process.stdout.write(`\r  📝 Generating text: ${Math.min(i + concurrency, prompts.length)}/${prompts.length}`);
      }
    }
    
    if (prompts.length > 100) console.log(); // New line after progress
    return results;
  }
  
  async generateSingle(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
        options: { temperature: this.config.temperature },
      }),
    });
    
    const data = await response.json();
    return data.response.trim();
  }
}
```

### 11.2 Vietnamese Text Generation Prompts

```typescript
const OLLAMA_PROMPTS = {
  
  productDescription: (name: string, category: string) =>
    `Viết mô tả sản phẩm tiếng Việt ngắn gọn cho: "${name}" (danh mục: ${category}).
     Yêu cầu: 2-3 câu, tự nhiên như trên sàn thương mại điện tử, không dùng markdown.`,
  
  customerReview: (productName: string, rating: number) => {
    const tone = rating >= 4 ? 'hài lòng và tích cực' : rating >= 3 ? 'bình thường, trung lập' : 'không hài lòng';
    return `Viết một đánh giá khách hàng tiếng Việt (${rating}/5 sao) cho sản phẩm "${productName}".
     Giọng văn: ${tone}. Khoảng 1-3 câu. Tự nhiên như người thật viết.`;
  },
  
  supportTicket: (issue: string) =>
    `Viết nội dung yêu cầu hỗ trợ của khách hàng về vấn đề: "${issue}".
     1-2 câu ngắn gọn, tiếng Việt thông thường, không formal quá.`,
  
  addressNote: () =>
    `Tạo một ghi chú giao hàng ngắn bằng tiếng Việt. Ví dụ: "Gọi trước 30 phút", "Để tại bảo vệ", "Giao giờ hành chính".
     Chỉ cần 1 câu ngắn, không quá 20 từ.`,
  
  productName: (category: string) =>
    `Tạo một tên sản phẩm thực tế bằng tiếng Việt cho danh mục: ${category}.
     Ngắn gọn (3-7 từ), như trên Shopee/Lazada. Chỉ tên, không mô tả thêm.`,
};
```

---

## 12. Data Flow (E2E)

### 12.1 Happy Path — Prisma Schema to Seeded Database

```
Input: prisma/schema.prisma + mock-data.config.yaml
  ↓ (Schema Parser: ~1s)
NormalizedSchema: 8 entities, 15 relations, 4 enums extracted
  ↓ (Domain Detector — Claude API: ~3s, one-time)
DomainContext: { domain: 'ecommerce', market: 'vietnam', hints: {...} }
  ↓ (Dependency Resolver: ~0ms)
SeedOrder: ["Category", "User", "Product", "ProductVariant", 
            "Address", "Order", "OrderItem", "Review"]
  ↓ (Strategy Planner: ~100ms)
FieldStrategies: 87 fields mapped to strategies
  - 71 fields → Faker
  - 12 fields → Ollama (descriptions, reviews)
  - 4 fields → Statistical distribution (prices, statuses)
  ↓ (Data Generator — parallel:)
  ├── Faker fields: ~200ms for 5000 records
  ├── Ollama text: ~45s for 500 product descriptions (3 concurrent)
  └── Distributions: ~50ms
  ↓ (Edge Case Injector: ~100ms)
250 edge case records injected (5% of 5000)
  ↓ (Output Formatter: ~500ms)
Generated: prisma/seed.ts (formatted TypeScript)
           tests/fixtures/data.json
  ↓ (Optional: Direct DB insertion)
Running: npx prisma db seed
  ✓ Category: 12 records
  ✓ User: 500 records
  ✓ Product: 1000 records
  ✓ ProductVariant: 2000 records
  ✓ Address: 600 records
  ✓ Order: 2500 records
  ✓ OrderItem: 7500 records
  ✓ Review: 800 records
Total: 14,912 records in ~52 seconds
```

### 12.2 CLI Interface

```bash
# Basic usage
npx vibe-mock-data generate --schema ./prisma/schema.prisma

# With config file
npx vibe-mock-data generate --config ./mock-data.config.yaml

# Quick seed (use defaults, skip Ollama, 100 records per entity)
npx vibe-mock-data generate --schema ./prisma/schema.prisma --quick

# Vietnamese market with Ollama
npx vibe-mock-data generate --schema ./prisma/schema.prisma \
  --market vietnam --use-ollama --ollama-model llama3.1:8b

# Generate only JSON fixtures
npx vibe-mock-data generate --schema ./prisma/schema.prisma \
  --output json --output-dir ./tests/fixtures

# Generate factory functions
npx vibe-mock-data factories --schema ./prisma/schema.prisma \
  --output ./tests/factories

# Deterministic mode (for CI)
npx vibe-mock-data generate --schema ./prisma/schema.prisma --seed 42

# Show generation plan without generating
npx vibe-mock-data plan --schema ./prisma/schema.prisma

# Run only edge case generation
npx vibe-mock-data edge-cases --schema ./prisma/schema.prisma --entity Order
```

---

## 13. Self-Learning Knowledge System

### 13.1 Knowledge Sources

| Source | Content | Update Frequency |
|--------|---------|-----------------|
| Faker.js changelog | New locale support, new methods | On release |
| Vietnamese administrative data | New wards/communes after mergers | Quarterly |
| Vietnamese phone prefix registry | VNPT/Viettel/Mobifone new prefixes | Quarterly |
| Test data best practices blogs | New edge case patterns | Monthly |
| HuggingFace dataset releases | New Vietnamese text corpora | Monthly |

### 13.2 Vietnamese Data Freshness

Vietnam's administrative divisions change periodically:
- 2020-2023: significant district/ward mergers
- New provinces/districts → update `wards.json`, `districts.json`
- New telecom prefixes → update phone generator

---

## 14. Performance Targets

| Metric | Target |
|--------|--------|
| Schema parsing (Prisma) | < 500ms |
| Domain detection (Claude API) | < 5 seconds (one-time) |
| Dependency graph resolution | < 100ms |
| Faker-only generation (10K records) | < 2 seconds |
| Ollama text generation (500 texts) | < 60 seconds (3 concurrent) |
| Edge case injection | < 500ms |
| Seed script generation | < 1 second |
| Total (10K records, with Ollama) | < 90 seconds |
| Total (10K records, without Ollama) | < 10 seconds |
| Memory usage (100K records) | < 512 MB |

---

## 15. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Circular foreign key dependencies | Medium | High | Detect cycles and report to user; suggest nullable FK or generation order override |
| Ollama not installed/running | High | Low | Graceful fallback to Faker for all text; warn user but continue |
| Schema format not supported | Medium | Medium | Generic JSON schema fallback; error with helpful message |
| Generated data violates CHECK constraints | Medium | Medium | Post-generation constraint validation; regenerate violating records |
| Unique constraint violations at high volume | Low | Medium | Track generated unique values; detect collision before inserting |
| Ollama generates non-Vietnamese text | Low | Low | Post-process: if < 50% Vietnamese characters, regenerate |
| Very large schemas (50+ tables) | Low | Medium | Batch processing; progress indicators; memory-efficient streaming |

---

## 16. Success Metrics

### Technical KPIs
- [ ] Referential integrity: 100% of generated FK values point to existing records
- [ ] Unique constraint compliance: 100% (zero violations in generated data)
- [ ] Schema parsing accuracy: 98%+ field extraction on 20 test schemas
- [ ] Vietnamese name quality: all names have correct diacritics (automated check)
- [ ] Ollama fallback: zero generation failures when Ollama unavailable

### Developer Experience KPIs
- [ ] "Works in 5 minutes" for Prisma schema: install → config → seed < 5 minutes
- [ ] Generated data is "production-like": developer survey ≥ 4/5 realism rating
- [ ] CI-compatible: deterministic `--seed 42` produces identical output every time

### Coverage KPIs
- [ ] Edge case coverage: at least 10 distinct edge case scenarios per generation run
- [ ] Status distribution realism: order statuses match configured weights ±2%
- [ ] Temporal distribution: generated timestamps cluster realistically around business hours

---

*End of PROJECT-detail.md*
