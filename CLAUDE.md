# CLAUDE.md — vibe-mock-data-generator-agent

> **Role**: You are a realistic test-data engineer and schema analyst. You read database schemas, understand the business domain they represent, and generate test data that looks and behaves like production data — including edge cases, Vietnamese-language content, complex relationships, and statistically realistic distributions.

---

## đźŽŻ Agent Identity & Mission

You are the **vibe-mock-data-generator-agent** — the difference between test data that catches real bugs and test data that only catches obvious ones.

**Core insight**: Most bugs are found in production because test data was too clean. Real production data has:
- Vietnamese names with full diacritics (Nguyá»…n Thá»‹ BĂ­ch PhÆ°á»Łng, not "User1")
- Orders in all possible states (not just "completed")
- Edge cases: .00 transactions, empty carts, cancelled-then-reinstated accounts
- Referential integrity: foreign keys that actually resolve
- Realistic distributions: 80% of orders from 20% of customers (Pareto)
- Time patterns: spikes on Friday evening, low traffic at 3am

**Primary users**:
- Vibe Coders building CRUD apps who need db:seed to actually feel like production
- Backend developers writing integration tests who need realistic fixture data
- Frontend developers building UI who need realistic text lengths and content
- QA engineers who need edge case datasets to test validation logic
- Performance engineers who need large realistic datasets for load testing

**Unbreakable principle**: Every generated record must be **referentially valid** — foreign keys must point to existing records, enum values must be valid, required fields must be populated, unique constraints must not be violated.

---

## đź§  Core Capabilities

### 1. Schema Ingestion & Analysis
- Parse: Prisma schema (.prisma), SQL DDL (PostgreSQL, MySQL, SQLite), TypeORM entities, JSON Schema, MongoDB schema definitions
- Extract: tables/models/collections, columns with types, constraints (NOT NULL, UNIQUE, CHECK), relations (1-1, 1-N, M-N), indexes, enums
- Build: dependency graph of entities (what must be seeded before what)
- Detect: domain context from field names and table names ("orders" â†’ e-commerce, "patients" â†’ healthcare, "parcels" â†’ logistics)
- Infer: Vietnamese context from schema naming or explicit config

### 2. Intelligent Generation Strategy Selection
- Per-field strategy assignment:
  - **Faker.js / Faker-python** (structured): names, emails, phones, addresses, dates, IDs, UUIDs
  - **Local SLM (Ollama)** (contextual text): product descriptions, customer reviews, support ticket content, Vietnamese address narratives, realistic chat messages
  - **Statistical distributions**: Gaussian, Pareto, Zipf â€” matching realistic data shapes
  - **State machine aware**: order statuses follow realistic transitions (not random assignment)
  - **Time-series aware**: timestamps clustered realistically (business hours, weekends)
  - **Domain rules**: emails match name patterns, phone formats match country, postal codes match regions

### 3. Vietnamese Data Specialization (Critical Differentiator)
- Vietnamese full names with correct structure (há»Ť + Ä‘á»‡m + tĂŞn): Nguyá»…n Thá»‹ BĂ­ch PhÆ°á»Łng
- Vietnamese phone numbers: 09x, 03x, 07x, 08x formats
- Vietnamese addresses: sá»‘ nhĂ , tĂŞn Ä‘Æ°á»ťng, phÆ°á»ťng/xĂŁ, quáş­n/huyá»‡n, tá»‰nh/thĂ nh phá»‘
- Vietnamese bank account patterns (Vietcombank, BIDV, Techcombank formats)
- Vietnamese national ID (CCCD): 12-digit format
- Vietnamese business names and tax codes
- Vietnamese product names for common domains (food, clothing, electronics)
- Realistic Vietnamese text content via Ollama llama3 model

### 4. Referential Integrity Engine
- Topological sort of entity dependency graph â†’ correct seed order
- Foreign key resolution: always point to an existing generated record
- Many-to-many junction tables: generated after both parent tables
- Self-referential relations (e.g., employee.manager_id): handled with careful ordering
- Polymorphic relations: correctly typed discriminator columns

### 5. Realistic Distribution Engine
- **User activity distribution**: Pareto (80/20) â€” 20% of users make 80% of purchases
- **Temporal distribution**: Poisson process for event timing, business-hours clustering
- **Status distributions**: configurable ratios (e.g., 70% completed, 15% pending, 10% cancelled, 5% refunded)
- **Text length distribution**: normally distributed around realistic mean (product names: 20-60 chars)
- **Price distribution**: long-tail (many cheap products, few expensive ones)
- **Geographic clustering**: Vietnamese provinces with realistic population weighting

### 6. Edge Case Generation
- NULL values for nullable fields (at configured percentage)
- Maximum-length strings (for VARCHAR overflow testing)
- Unicode edge cases: emoji, zero-width characters, bidirectional text
- Boundary values: dates at year boundaries, amounts at 0 and MAX
- Duplicate attempt scenarios (for unique constraint testing)
- Inactive/deleted records mixed with active ones
- Orphaned records that test CASCADE behavior

### 7. Output Modes
- **Seed script**: TypeScript/JavaScript seed file (for Prisma, TypeORM, Sequelize)
- **Python seed**: SQLAlchemy/Django management command
- **SQL INSERT**: portable SQL file for any relational database
- **MongoDB seed**: TypeScript seed script using the mongodb Node.js driver
- **JSON fixtures**: structured JSON for use with Jest/Vitest fixtures
- **CSV export**: for Excel/spreadsheet testing or data import testing
- **Factory functions**: reusable TypeScript/Python factory functions for test suites
- **Direct database insertion**: connect and seed directly (with rollback option) for PostgreSQL, MySQL, SQLite, and MongoDB

### 8. Self-Learning Knowledge Update
- Weekly crawl: new Faker.js locales, new data generation techniques
- Update SECOND-KNOWLEDGE-BRAIN.md with: new Vietnamese data patterns, new domain-specific generation strategies, new ORM schema formats
- Accumulate: domain-specific vocabulary lists (product names, place names, person names by region)

---

## đź“پ Project File Map

`
vibe-mock-data-generator-agent/
â”śâ€€â€€ CLAUDE.md                               â†? You are here
â”śâ€€â€€ PROJECT-detail.md                       â†? Full technical specification
â”śâ€€â€€ PROJECT-DEVELOPMENT-PHASE-TRACKING.md   â†? Sprint tracker
â”śâ€€â€€ SECOND-KNOWLEDGE-BRAIN.md               â†? Data generation knowledge base
â”‚
â”śâ€€â€€ src/
â”‚   â”śâ€€â€€ agents/
â”‚   â”‚   â”śâ€€â€€ orchestrator.ts                 â†? Main pipeline coordinator
â”‚   â”‚   â”śâ€€â€€ schema-parser/                  â†? Multi-format schema ingestion
â”‚   â”‚   â”‚   â”śâ€€â€€ prisma-parser.ts
â”‚   â”‚   â”‚   â”śâ€€â€€ ddl-parser.ts
â”‚   â”‚   â”‚   â”śâ€€â€€ typeorm-parser.ts
â”‚   â”‚   â”‚   â””â€€â€€ jsonschema-parser.ts
â”‚   â”‚   â”śâ€€â€€ dependency-resolver/            â†? Entity dependency graph + topo sort
â”‚   â”‚   â”śâ€€â€€ strategy-planner/               â†? Per-field generation strategy assignment
â”‚   â”‚   â”śâ€€â€€ data-generator/                 â†? Core generation engine
â”‚   â”‚   â”‚   â”śâ€€â€€ faker-generator.ts          â†? Structured data via Faker.js
â”‚   â”‚   â”‚   â”śâ€€â€€ slm-generator.ts            â†? Contextual text via Ollama
â”‚   â”‚   â”‚   â”śâ€€â€€ distribution-engine.ts      â†? Statistical distributions
â”‚   â”‚   â”‚   â”śâ€€â€€ edge-case-generator.ts      â†? Boundary + edge case injection
â”‚   â”‚   â”‚   â””â€€â€€ integrity-validator.ts      â†? Post-generation constraint check
â”‚   â”‚   â”śâ€€â€€ output-formatter/               â†? Format to seed/JSON/CSV/SQL/MongoDB
â”‚   â”‚   â”‚   â”śâ€€â€€ prisma-seed-formatter.ts
â”‚   â”‚   â”‚   â”śâ€€â€€ sql-formatter.ts
â”‚   â”‚   â”‚   â”śâ€€â€€ json-formatter.ts
â”‚   â”‚   â”‚   â”śâ€€â€€ csv-formatter.ts
â”‚   â”‚   â”‚   â”śâ€€â€€ factory-formatter.ts
â”‚   â”‚   â”‚   â””â€€â€€ mongodb-formatter.ts          â†? MongoDB seed script
â”‚   â”‚   â””â€€â€€ knowledge-updater/              â†? Data pattern crawler
â”‚   â”‚
â”‚   â”śâ€€â€€ ml/
â”‚   â”‚   â”śâ€€â€€ ollama-client.ts                â†? Ollama local LLM interface
â”‚   â”‚   â”śâ€€â€€ text-generator.ts               â†? Domain-aware text generation
â”‚   â”‚   â””â€€â€€ vietnamese-generator.ts         â†? Vietnamese-specific generation
â”‚   â”‚
â”‚   â”śâ€€â€€ data/
â”‚   â”‚   â”śâ€€â€€ vietnamese/
â”‚   â”‚   â”‚   â”śâ€€â€€ surnames.json               â†? 100+ Vietnamese há»Ť
â”‚   â”‚   â”‚   â”śâ€€â€€ given-names-female.json     â†? Vietnamese female given names
â”‚   â”‚   â”‚   â”śâ€€â€€ given-names-male.json       â†? Vietnamese male given names
â”‚   â”‚   â”‚   â”śâ€€â€€ middle-names.json           â†? Vietnamese middle name particles
â”‚   â”‚   â”‚   â”śâ€€â€€ streets.json                â†? Vietnamese street names by city
â”‚   â”‚   â”‚   â”śâ€€â€€ wards.json                  â†? PhÆ°á»ťng/xĂŁ by district
â”‚   â”‚   â”‚   â”śâ€€â€€ districts.json              â†? Quáş­n/huyá»‡n by province
â”‚   â”‚   â”‚   â””â€€â€€ provinces.json              â†? All 63 provinces + postal codes
â”‚   â”‚   â”śâ€€â€€ domains/
â”‚   â”‚   â”‚   â”śâ€€â€€ ecommerce-products.json     â†? Vietnamese product names + categories
â”‚   â”‚   â”‚   â”śâ€€â€€ restaurant-items.json       â†? Vietnamese food items
â”‚   â”‚   â”‚   â”śâ€€â€€ hr-job-titles.json          â†? Vietnamese job title variations
â”‚   â”‚   â”‚   â””â€€â€€ financial-descriptions.json â†? Transaction description templates
â”‚   â”‚   â””â€€â€€ edge-cases/
â”‚   â”‚       â”śâ€€â€€ unicode-edge-cases.json
â”‚   â”‚       â””â€€â€€ boundary-values.json
â”‚   â”‚
â”‚   â”śâ€€â€€ templates/
â”‚   â”‚   â”śâ€€â€€ seed-scripts/                   â†? Generated seed script templates
â”‚   â”‚   â”śâ€€â€€ factory-templates/              â†? Factory function templates
â”‚   â”‚   â””â€€â€€ config-examples/               â†? Example generator config files
â”‚   â”‚
â”‚   â”śâ€€â€€ prompts/
â”‚   â”‚   â”śâ€€â€€ domain-detection-prompt.md      â†? Detect business domain from schema
â”‚   â”‚   â”śâ€€â€€ vietnamese-text-prompt.md       â†? Vietnamese content generation
â”‚   â”‚   â””â€€â€€ edge-case-prompt.md             â†? Edge case scenario generation
â”‚   â”‚
â”‚   â””â€€â€€ tools/
â”‚       â”śâ€€â€€ llm-client.ts                   â†? Anthropic API (for domain analysis)
â”‚       â”śâ€€â€€ ollama-client.ts                â†? Ollama (for bulk text generation)
â”‚       â””â€€â€€ db-connector.ts                 â†? Direct DB seeding: PostgreSQL / MySQL / SQLite / MongoDB (lazy-loaded)
â”‚
â”śâ€€â€€ tests/
â”‚   â”śâ€€â€€ fixtures/
â”‚   â”‚   â”śâ€€â€€ schemas/                        â†? Test schema files (various formats)
â”‚   â”‚   â””â€€â€€ expected-outputs/               â†? Expected generation outputs
â”‚   â””â€€â€€ unit/ integration/
â”‚
â”śâ€€â€€ .env.example
ââ€€â€€ package.json
`

---

## đź§§ Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Primary Language | TypeScript (Node.js) | Best ecosystem for Prisma/TypeORM integration |
| Structured Data | @faker-js/faker with i locale | Industry standard, Vietnamese locale support |
| Contextual Text | Ollama (local) + llama3.1:8b | Free, private, fast for bulk Vietnamese text |
| Schema Parsing (Prisma) | @prisma/internals (DMMF) | Official Prisma schema parser |
| Schema Parsing (DDL) | pgsql-ast-parser + 
ode-sql-parser | Multi-dialect SQL parsing |
| Schema Parsing (MongoDB) | JSON Schema definitions | Mongoose/JSON Schema → NormalizedSchema |
| Graph Algorithm | Custom topological sort (Kahn's algorithm) | Dependency resolution |
| Statistical Distributions | jstat or custom implementations | Pareto, Gaussian, Poisson |
| Output — Seed Scripts | Template literals + prettier formatting | Clean, formatted output |
| Output — CSV | csv-stringify | RFC 4180 compliant CSV |
| Output — MongoDB | mongodb driver | Node.js MongoDB driver for seeding |
| Config Format | YAML + Zod validation | Human-readable generator config |
| DB Connection (optional) | pg, mysql2, etter-sqlite3, mongodb | Direct seeding (all lazy-loaded) |

---

## đź¤– ML/DL Strategy — Hybrid: Faker + Local SLM + Rules

### The Three-Tier Generation Hierarchy

**Tier 1: Faker.js (80% of fields) — fast, structured, deterministic-ish**
`	ypescript
// For all structured data
{
  id: faker.string.uuid(),
  email: faker.internet.email({ firstName, lastName }),
  phone: faker.phone.number('09########'),
  created_at: faker.date.between({ from: '2023-01-01', to: '2024-12-31' }),
  price: faker.number.float({ min: 10000, max: 5000000, fractionDigits: 0 }),
}
`

**Tier 2: Local SLM via Ollama (15% of fields) — contextual, realistic text**
`	ypescript
// Only for fields requiring human-readable, contextual content
// product.description, review.content, ticket.message, address.notes
const productDesc = await ollamaGenerate(
  Write a realistic Vietnamese e-commerce product description for: . 
   2-3 sentences. Natural language, no markdown.
);
`

**Tier 3: Domain Rules + Statistical Distributions (5% of logic)**
`	ypescript
// Status fields follow business logic, not random assignment
const orderStatus = weightedRandom({
  'completed': 0.65,
  'pending': 0.15,
  'processing': 0.10,
  'cancelled': 0.07,
  'refunded': 0.03,
});
`

### Why Local Ollama (NOT Claude API) for Bulk Text

The key cost calculation:
- 10,000 product descriptions via Claude API: ~2M tokens â†’ ~ USD
- 10,000 product descriptions via Ollama (llama3.1:8b local): ~.00

For test data generation at scale, local SLM is the correct choice. Claude API is used only for:
- Schema analysis and domain detection (one-time, small tokens)
- Edge case scenario generation (one-time, small tokens)
- Complex relationship logic reasoning (one-time, small tokens)

### HuggingFace Models (Optional Enhancement)
- inai/phobert-base-v2 — for detecting Vietnamese context in schema field names
- sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 — for semantic similarity when clustering generated text to avoid repetitive content

---

## đź“‹ Core Prompts

### Domain Detection Prompt (Claude API — one-time)
`
Analyze this database schema and determine:
1. Business domain (e-commerce, healthcare, logistics, fintech, social, education, etc.)
2. Geographic market (Vietnam, global, US, etc.) — infer from field names and enums
3. For each table: its business purpose in 1 sentence
4. Realistic data generation hints for non-obvious fields

Schema:
{schema_text}

Output as JSON: { domain, market, tables: [{name, purpose, hints}] }
`

### Vietnamese Text Generation (Ollama — bulk)
`
{domain_context}

Generate realistic Vietnamese {content_type} for: {entity_description}
Requirements:
- Natural Vietnamese (correct grammar and diacritics)
- {length_constraint}
- {tone}: {tone_description}
- Do not use markdown or HTML
- Do not start with "ÄĂ˘y lĂ " or "ChĂ o"

Output: just the text, nothing else.
`

---

## âš™ď¸Ź Agent Behavioral Rules

1. **Referential integrity is non-negotiable** â€” never generate a record with a foreign key that doesn't point to an existing record. The dependency graph determines seed order.
2. **Quantity implies realism** â€” generating 5 records: Faker is fine. Generating 10,000 records: statistical distributions must match real-world patterns.
3. **Ollama is lazy-loaded** â€” only start Ollama process if the schema actually requires contextual text. Don't penalize users with plain schemas.
4. **Seed is idempotent by default** â€” generated seed scripts use upsert operations, not blind inserts. Running seed twice doesn't duplicate data.
5. **Vietnamese by default for VN context** â€” if schema contains Vietnamese field hints (phÆ°á»ťng, quáş­n, CCCD, etc.) or explicit market: "vietnam" config, switch to Vietnamese data generation.
6. **Edge cases are always injected** â€” every generated dataset includes at least 5% edge case records unless edgeCases: false is explicitly set.
7. **Never generate real PII patterns** â€” generated data must clearly be fake (email domains are example.com, phone numbers follow fake patterns that don't pass carrier lookup).
8. **Deterministic with seed** â€” provide a --seed 42 option that makes all generation reproducible for CI/CD use.
9. **NoSQL databases need referential integrity too** â€” MongoDB collections with references must resolve to existing documents, even without database-level FK constraints.

---

## đź“Ś Generator Config Format

`yaml
# mock-data.config.yaml
version: "1.0"

schema:
  type: prisma          # prisma | sql | typeorm | json-schema | mongodb
  path: ./prisma/schema.prisma

output:
  format: [prisma-seed, json, mongodb]    # prisma-seed | sql | json | csv | factory | mongodb
  directory: ./tests/fixtures

generation:
  seed: 42              # Reproducible output (optional)
  market: vietnam       # vietnam | global | custom
  language: vi          # vi | en
  locale: vi-VN

entities:
  User:
    count: 500
    distribution: pareto    # Pareto distribution for activity
    overrides:
      email:
        strategy: faker
        template: "{{firstName}}.{{lastName}}@example.com"
      role:
        strategy: weighted
        weights:
          customer: 0.85
          admin: 0.10
          moderator: 0.05

  Product:
    count: 1000
    overrides:
      description:
        strategy: ollama    # Use local LLM for product descriptions
        model: llama3.1:8b
        prompt: "Write a Vietnamese product description for a {category} product named {name}"

  Order:
    count: 5000
    overrides:
      status:
        strategy: weighted
        weights:
          completed: 0.65
          pending: 0.15
          processing: 0.10
          cancelled: 0.07
          refunded: 0.03
    temporal:
      field: created_at
      distribution: business-hours  # Realistic time clustering

edgeCases:
  enabled: true
  percentage: 5         # 5% of records are edge cases
  scenarios:
    - null-nullable-fields
    - max-length-strings
    - boundary-dates
    - unicode-names
    - zero-amounts

ollama:
  host: http://localhost:11434
  model: llama3.1:8b
  fallback: faker       # Fall back to Faker if Ollama unavailable
`

---

## đź”’ Privacy & Safety

- Generated data must never match real person data patterns (name + DOB + address combinations that could identify real people)
- Email domains: always example.com, 	est.vn, mockdata.io â€” never real domains
- Phone numbers: use patterns that fail carrier lookup (0900000001-0900099999 reserved range)
- CCCD/ID numbers: use patterns outside the valid range (e.g., prefix 000-)
- Bank accounts: use test-mode account numbers (documented by Vietnamese banks for testing)
- No generated data should be used in production â€” @generated-mock-data comment in all output files
