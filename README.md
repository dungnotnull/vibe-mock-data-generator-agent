# vibe-mock-data-generator-agent

> **Generate realistic, referentially valid test data from database schemas -- with Vietnamese data specialization.**

<p align="center">
  <strong>Schema-Driven</strong> &bull;
  <strong>FK-Safe</strong> &bull;
  <strong>Vietnamese-Native</strong> &bull;
  <strong>Deterministic</strong> &bull;
  <strong>5 Output Formats</strong>
</p>

---

## The Problem

Most test data tools generate `user@user.com` and `User1`. This one generates `nguyen.thi.bich.phuong@example.com` and `Nguyen Thi Bich Phuong` -- because production bugs hide in cultural edge cases.

`
// What most tools seed:                   // What this tool seeds:
{                                           {
  name: "User 1",                             name: "Nguyen Thi Bich Phuong",
  email: "user1@test.com",                    email: "nguyen.thi.bich.phuong@example.com",
  phone: "1234567890",                        phone: "0912345678",
  role: "user"                                role: "CUSTOMER"
}                                           }
`

---

## Features

| | Feature | Description |
|---|---------|-------------|
| :card_file_box: | **Schema-Driven** | Parse Prisma, SQL DDL, TypeORM, JSON Schema -- auto-generate matching test data |
| :link: | **Referential Integrity Guaranteed** | All foreign keys point to existing records, 0 FK violations |
| :flag_vn: | **Vietnamese-Native** | Weighted Vietnamese names, phones, addresses, CCCD IDs, VND prices |
| :chart_with_upwards_trend: | **Statistical Distributions** | Pareto (80/20), business hours clustering, order status state machines |
| :test_tube: | **Edge Case Injection** | 5% of records include unicode, max-length, boundary, and null edge cases |
| :file_folder: | **5 Output Formats** | Prisma seed, SQL INSERT, JSON fixtures, CSV, TypeScript factory functions |
| :key: | **Deterministic Mode** | `--seed 42` produces identical output for CI/CD |
| :robot: | **Ollama Integration** | Local SLM for realistic Vietnamese text (with Faker fallback) |

---

## Quick Start

`ash
# Install
npm install

# Build
npm run build

# Generate from SQL DDL schema
node dist/index.js --schema ./schema.sql --type ddl --output ./generated --format json

# With Vietnamese market defaults + all formats
node dist/index.js --schema ./schema.sql --type ddl --format prisma-seed,sql,json,csv,factory

# Quick mode (JSON only, 100 records per entity)
node dist/index.js --schema ./schema.sql --type ddl --quick

# Deterministic mode for CI/CD
node dist/index.js --schema ./schema.sql --type ddl --seed 42
`

---

## CLI Reference

| Flag | Description | Default |
|------|-------------|---------|
| `--schema <path>` | Path to schema file | Required |
| `--type <type>` | Schema type: `prisma`, `ddl`, `typeorm`, `jsonschema` | Auto-detected from extension |
| `--config <path>` | Path to config YAML/JSON file | -- |
| `--output <dir>` | Output directory | `./generated` |
| `--format <fmts>` | Output formats (comma-separated) | `prisma-seed,json` |
| `--seed <num>` | Random seed for deterministic output | -- |
| `--market <mkt>` | Market: `vietnam`, `global`, `us`, `eu` | `vietnam` |
| `--quick` | Quick mode: JSON only, 100 records | -- |
| `--help` | Show help message | -- |

### Schema Type Auto-Detection

| File Extension | Detected Type |
|---------------|-------------|
| `.prisma` | Prisma |
| `.sql` | DDL |
| `.ts` / `.js` | TypeORM |
| `.json` | JSON Schema |

---

## Output Formats

| Format | File | Use Case |
|--------|------|----------|
| `prisma-seed` | `seed.ts` | Run `npx prisma db seed` directly |
| `sql` | `seed.sql` | Import into any SQL database |
| `json` | `fixtures.json` | Use as Jest/Vitest fixtures |
| `csv` | `<entity>.csv` | Excel/spreadsheet testing |
| `factory` | `factories.ts` | Reusable TypeScript factory functions for test suites |

### Example: Prisma Seed Output

`	ypescript
// @generated-mock-data -- DO NOT USE IN PRODUCTION
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clean existing data (in reverse dependency order)
  await prisma.orderItems.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.users.deleteMany({});

  // Seed in dependency order
  await prisma.users.createMany({
    data: [{ id: "5fb9220d-...", email: "XuanTam.Ly@example.com", ... }],
    skipDuplicates: true,
  });
  // ...
}

main()
  .then(async () => { await prisma.(); })
  .catch(async (e) => { console.error(e); await prisma.(); process.exit(1); });
`

### Example: Factory Functions Output

`	ypescript
export type User = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
};

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email({ provider: 'example.com' }),
    full_name: faker.person.fullName(),
    phone: faker.phone.number('09########'),
    role: faker.helpers.arrayElement(['CUSTOMER', 'ADMIN', 'MODERATOR']),
    ...overrides,
  };
}

export function createUsers(count: number, overrides = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}
`

---

## Configuration

Create `mock-data.config.yaml`:

`yaml
version: "1.0"

schema:
  type: ddl
  path: ./schema.sql

output:
  formats: [json, prisma-seed]
  directory: ./generated

generation:
  seed: 42                    # Deterministic output
  market: vietnam              # vietnam | global | us | eu

entities:
  User:
    count: 500
    distribution: pareto
  Order:
    count: 5000
    overrides:
      status:
        strategy: distribution
        weights:
          completed: 0.65
          pending: 0.15
          processing: 0.10
          cancelled: 0.07
          refunded: 0.03

edgeCases:
  enabled: true
  percentage: 5

ollama:
  host: http://localhost:11434
  model: llama3.1:8b
  fallback: faker              # Falls back to Faker when Ollama is unavailable
`

Then run:

`ash
node dist/index.js --config ./mock-data.config.yaml
`

---

## Vietnamese Data

Built-in data assets for the Vietnamese market:

| :bust_in_silhouette: Names | :phone: Phones | :house: Addresses |
|---|---|---|
| 25 weighted surnames (96%+ coverage) | All VN carrier prefixes | Province > District > Ward > Street |
| 40 female + 40 male given names | Viettel (50%), Mobifone (20%) | 63 provinces with population weights |
| 20 middle names with gender mapping | Vinaphone (20%), Others (10%) | 45 districts, 42 wards, 43 streets |

### Vietnamese Data Generators

| Generator | Output Example |
|-----------|---------------|
| `generateVietnameseName()` | `Nguyen Thi Bich Phuong` |
| `generateVietnamesePhone()` | `0912345678` |
| `generateVietnameseAddress()` | `826 Vo Van Tan, Quan 5, Da Nang` |
| `generateVietnameseCCCD()` | `996195775132` (12-digit, fake 900+ prefix) |
| `generateVNDPrice('mid')` | `287000` (rounded to 1000 VND) |

### Surname Distribution (Pareto-weighted)

Just 14 surnames cover ~90% of the Vietnamese population:

`
Nguyen (38.4%)  >  Tran (11.1%)  >  Le (9.8%)  >  Pham (7.4%)  >  Hoang/Huynh (10.6%)  >  ...
`

---

## Architecture

`
Schema File
    |
    v
+-------------------+
| Schema Parser      |  Prisma / DDL / TypeORM / JSON Schema --> NormalizedSchema
+-------------------+
    |
    v
+-------------------+
| Domain Detector    |  Heuristic + optional LLM --> DomainContext
+-------------------+
    |
    v
+-------------------+
| Dependency Resolver|  Kahn's algorithm topological sort --> Seed Order
+-------------------+
    |
    v
+-------------------+
| Strategy Planner   |  Per-field strategy: faker / ollama / distribution / domain-rule
+-------------------+
    |
    v
+-------------------+
| Data Generator     |  Faker (80%) + Ollama (15%) + Distributions (5%)
+-------------------+
    |
    v
+-------------------+
| Edge Case Injector |  5% boundary / unicode / null / injection edge cases
+-------------------+
    |
    v
+-------------------+
| Integrity Validator|  FK / NOT NULL / UNIQUE / Enum / MaxLength checks
+-------------------+
    |
    v
+-------------------+
| Output Formatter   |  seed.ts / seed.sql / fixtures.json / *.csv / factories.ts
+-------------------+
`

---

## Project Structure

`
src/
  agents/
    orchestrator.ts                # Main 8-step pipeline coordinator
    schema-parser/                 # Prisma + SQL DDL + TypeORM + JSON Schema parsers
    dependency-resolver/           # Kahn's algorithm topological sort
    strategy-planner/              # Per-field generation strategy with common enum defaults
    data-generator/                # Faker, distributions, edge cases, integrity validation
    output-formatter/              # Prisma seed, SQL, JSON, CSV, factory formatters
  ml/
    ollama-client.ts               # Local SLM with graceful Faker fallback
    text-generator.ts              # Vietnamese text generation prompts (with diacritics)
    vietnamese-generator.ts        # Name / phone / address / CCCD / VND generators
  data/                            # 14 JSON data assets (Vietnamese, domains, edge cases)
  types/                            # TypeScript type definitions (NormalizedSchema, StrategyPlan, etc.)
  tools/
    config-parser.ts                # Zod-validated config with YAML/JSON file loading
    llm-client.ts                   # Anthropic API for domain detection (heuristic fallback)
    db-connector.ts                 # Direct DB seeding: PostgreSQL / MySQL / SQLite (lazy-loaded)
  prompts/                          # Domain detection, Vietnamese text, edge case prompts
  index.ts                          # CLI entry point with shebang
`

---

## Statistical Distributions

### Pareto (80/20) -- User Activity

| Tier | % of Users | Order Count |
|------|-----------|-------------|
| :whale: Whale | 2% | 50-200 orders |
| :fire: Heavy | 18% | 10-50 orders |
| :bar_chart: Moderate | 30% | 3-9 orders |
| :feet: Light | 30% | 1-2 orders |
| :zzz: Dormant | 20% | 0 orders |

### Business Hours Clustering

Timestamps cluster around Vietnamese e-commerce traffic patterns:

- :sunrise: Morning ramp: 6am-11am
- :office: Business peak: 9am-5pm weekdays
- :night_with_stars: Evening peak: 7pm-10pm (highest)

### Common Enum Defaults

Fields named `status`, `role`, `type`, `priority`, `gender` automatically get sensible weighted defaults:

`
role:     CUSTOMER (85%), ADMIN (10%), MODERATOR (5%)
status:   ACTIVE (65%), INACTIVE (15%), PENDING (10%), ARCHIVED (10%)
priority: LOW (40%), MEDIUM (35%), HIGH (20%), CRITICAL (5%)
gender:   MALE (49%), FEMALE (50%), OTHER (1%)
`

---

## Edge Cases

5% of generated records include intentional edge cases for testing:

| :test_tube: Scenario | What It Tests |
|---|---|
| Null nullable fields | NULL handling in application code |
| Max-length strings | VARCHAR overflow, UI truncation |
| Boundary dates | Leap year, epoch, Y2K38 |
| Unicode names | Diacritics, RTL, zero-width chars |
| Zero amounts | Division by zero, free item logic |
| Negative amounts | Refund exceeding payment |
| Empty strings | Blank field validation |
| SQL injection strings | Input sanitization |
| Duplicate attempts | UNIQUE constraint handling |
| Inactive + deleted | Soft delete + status conflict |

---

## Privacy & Safety

All generated data is clearly fake and safe for open-source use:

- :email: Email domains: `example.com`, `test.vn`, `mockdata.io` -- never real domains
- :phone: Phone numbers: use realistic VN prefixes but clearly fake subscriber numbers
- :id: CCCD/ID: use `900-999` prefix range (outside valid province codes)
- :bank: Bank accounts: use test-mode formats documented by Vietnamese banks
- :lock: All output files marked with `@generated-mock-data -- DO NOT USE IN PRODUCTION`

---

## Development

`ash
# Install dependencies
npm install

# Build (TypeScript compile + copy data files)
npm run build

# Dev mode (run directly with tsx)
npm run dev -- --schema ./schema.sql --type ddl

# Run compiled output
npm start -- --schema ./schema.sql --type ddl
`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (Node.js ESM) |
| Structured Data | `@faker-js/faker` with `vi` locale |
| Contextual Text | Ollama (local) with Faker fallback |
| Schema Parsing (Prisma) | `@prisma/internals` DMMF |
| Schema Parsing (DDL) | Regex-based multi-dialect SQL parser |
| Graph Algorithm | Kahn's algorithm (topological sort) |
| Config Validation | Zod v4 |
| Config Format | YAML (`js-yaml`) + JSON |

---

## License

MIT

---

<p align="center">
  Built with :heart: for the Vietnamese developer community
</p>
