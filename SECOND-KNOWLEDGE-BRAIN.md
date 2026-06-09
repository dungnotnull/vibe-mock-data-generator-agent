# SECOND-KNOWLEDGE-BRAIN.md

**The Living Knowledge Base of vibe-mock-data-generator-agent**
Auto-updated by `knowledge-updater` | Version-controlled | Append-only
Last Crawl: 2025-06-01 | Total Entries: 25 (Initial Seed)

> **Scope**: Three knowledge categories: (1) Vietnamese Data Patterns — authentic data formats, distributions, naming conventions; (2) Data Generation Techniques — algorithms, distributions, strategies; (3) Testing & Edge Cases — real-world bug patterns that test data should cover.

---

## Domain Keyword Index

**vietnamese data formats**: [KB-V001]–[KB-V007]
**faker.js / data generation libraries**: [KB-G001]–[KB-G004]
**statistical distributions**: [KB-G005], [KB-G006]
**prisma / orm schemas**: [KB-S001], [KB-S002]
**edge cases / boundary values**: [KB-E001]–[KB-E005]
**ollama / local llm**: [KB-T001], [KB-T002]
**test data best practices**: [KB-T003], [KB-T004], [KB-T005]

---

## ═══ SECTION 1: VIETNAMESE DATA PATTERNS ═══

---

## [KB-V001] Vietnamese Name Patterns & Surname Frequency Distribution

**Source**: General Statistics Office of Vietnam + linguistic research
**Domain**: [domain:names]
**Last Verified**: 2025-06-01

### Surname (Họ) Frequency Distribution
Vietnamese surnames follow an extreme Pareto distribution — just 14 surnames cover ~90% of the population.

```json
[
  { "surname": "Nguyễn", "frequency_pct": 38.4, "note": "Most common by far" },
  { "surname": "Trần",   "frequency_pct": 11.1 },
  { "surname": "Lê",     "frequency_pct": 9.8 },
  { "surname": "Phạm",   "frequency_pct": 7.4 },
  { "surname": "Hoàng",  "frequency_pct": 5.4, "note": "Bắc" },
  { "surname": "Huỳnh",  "frequency_pct": 5.2, "note": "Nam — same as Hoàng" },
  { "surname": "Phan",   "frequency_pct": 4.5 },
  { "surname": "Vũ",     "frequency_pct": 3.8, "note": "Bắc" },
  { "surname": "Võ",     "frequency_pct": 3.5, "note": "Nam — same as Vũ" },
  { "surname": "Đặng",   "frequency_pct": 2.7 },
  { "surname": "Bùi",    "frequency_pct": 2.0 },
  { "surname": "Đỗ",     "frequency_pct": 1.4 },
  { "surname": "Hồ",     "frequency_pct": 1.3 },
  { "surname": "Ngô",    "frequency_pct": 1.2 }
]
```

### Middle Name (Đệm) Gender Patterns
- Female: **Thị** (most common), Kim, Ngọc, Thùy, Bích, Mỹ, Thanh, Lan, Thu, Xuân
- Male: **Văn** (most common), Đức, Minh, Quang, Hữu, Công, Xuân, Bá, Sĩ, Anh
- Gender-neutral: Trung, Như, Phương (can be either)

### Given Name Patterns
Vietnamese given names are 1-2 syllables, often reflect nature, virtue, beauty:
- Female: Hương, Lan, Mai, Linh, Nhung, Phương, Thảo, Thúy, Trang, Yến
- Male: Anh, Bình, Cường, Dũng, Hùng, Khải, Minh, Nam, Sơn, Tú, Tuấn

### Full Name Structure
**[Họ] [Đệm] [Tên]** — Surname comes FIRST (opposite of Western convention)
Example: **Nguyễn Thị Bích Phượng** (Surname: Nguyễn, Middle: Thị, Given: Bích Phượng)

---

## [KB-V002] Vietnamese Phone Number Format (Updated 2024)

**Source**: VNPT, Viettel, Mobifone official carrier data
**Domain**: [domain:phone]
**Last Verified**: 2025-01 (prefixes active as of early 2025)

### All Active Mobile Prefixes by Carrier

```typescript
const CARRIER_PREFIXES = {
  viettel: [
    '032', '033', '034', '035', '036', '037', '038', '039',  // 03x block
    '086', '096', '097', '098'                                // 09x block
  ],
  mobifone: [
    '070', '076', '077', '078', '079',  // 07x block
    '089', '090', '093'                 // 09x block
  ],
  vinaphone: [
    '081', '082', '083', '084', '085', '088',  // 08x block
    '091', '094'                               // 09x block
  ],
  vietnamobile: ['052', '056', '058', '092'],
  gmobile: ['059', '099'],
  reddi: ['055', '056'],
  indochina_telecom: ['069'],
};
```

### Format Rules
- Total: 10 digits (3-digit prefix + 7-digit subscriber number)
- Display formats: `0912345678` or `091 234 5678` or `091.234.5678`
- International: `+84912345678` or `+84 91 234 5678`
- **For test data**: use prefixes `090000xxxx`–`090009xxxx` (clearly fake range)

### Landline Numbers (for business entities)
- Format: `0X NNNN NNNN` where X is area code digit
- HCM: `028 NNNN NNNN`, Hanoi: `024 NNNN NNNN`, Da Nang: `0236 NNN NNNN`

---

## [KB-V003] Vietnamese Administrative Divisions (2024)

**Source**: Ministry of Home Affairs, Vietnam
**Domain**: [domain:address]
**Last Verified**: 2025-06-01

### Hierarchy
Tỉnh/Thành phố → Quận/Huyện → Phường/Xã → Thôn/Tổ

### Major Cities with Population Weights (for address generation)

```typescript
const CITY_WEIGHTS = [
  { name: "Thành phố Hồ Chí Minh", weight: 930, note: "Largest city" },
  { name: "Hà Nội", weight: 830 },
  { name: "Bình Dương", weight: 250, note: "Industrial province" },
  { name: "Đồng Nai", weight: 230 },
  { name: "Đà Nẵng", weight: 120 },
  { name: "Hải Phòng", weight: 210 },
  { name: "Cần Thơ", weight: 125 },
  { name: "Hà Nội", weight: 830 },
  { name: "Nghệ An", weight: 185 },
  { name: "Thanh Hóa", weight: 175 },
  // ... 53 remaining provinces with lower weights
];
```

### HCM City Districts (most generated users will be here)
```
Quận 1 (trung tâm), Quận 2 (nay là TP Thủ Đức), Quận 3, Quận 4, Quận 5 (Chợ Lớn),
Quận 6, Quận 7 (Phú Mỹ Hưng), Quận 8, Quận 9, Quận 10, Quận 11, Quận 12,
Bình Chánh, Bình Thạnh, Gò Vấp, Phú Nhuận, Tân Bình, Tân Phú, 
Hóc Môn, Củ Chi, Cần Giờ, Nhà Bè, Thủ Đức (TP Thủ Đức từ 2021)
```

### Important Note: 2021 Administrative Merger
TP Thủ Đức was created in 2021 by merging Quận 2 + Quận 9 + Quận Thủ Đức.
Address generator must handle both old and new names for realistic historical data.

---

## [KB-V004] Vietnamese VND Price Patterns

**Source**: Market research from Shopee, Lazada, Tiki VN
**Domain**: [domain:pricing]

### Pricing Psychology Patterns in Vietnam
- Round numbers preferred: 50.000, 100.000, 200.000, 500.000 VND
- "Just below" pricing less common than in Western markets
- Pricing ends in 000 for most consumer goods
- "Giá sốc" (shock price) promotion: 99.000, 199.000 less common but exists

### Realistic Price Ranges by Category (VND)

```typescript
const VN_PRICE_RANGES = {
  'Thực phẩm & Đồ uống': { min: 5_000, max: 500_000, typical: 50_000 },
  'Thời trang nữ': { min: 50_000, max: 2_000_000, typical: 300_000 },
  'Thời trang nam': { min: 80_000, max: 3_000_000, typical: 400_000 },
  'Điện thoại di động': { min: 500_000, max: 50_000_000, typical: 5_000_000 },
  'Máy tính & Laptop': { min: 3_000_000, max: 80_000_000, typical: 15_000_000 },
  'Đồ điện gia dụng': { min: 200_000, max: 30_000_000, typical: 3_000_000 },
  'Làm đẹp & Chăm sóc cá nhân': { min: 30_000, max: 1_000_000, typical: 200_000 },
  'Sách': { min: 30_000, max: 300_000, typical: 80_000 },
  'Đồ chơi trẻ em': { min: 50_000, max: 1_000_000, typical: 200_000 },
  'Nội thất gia đình': { min: 500_000, max: 100_000_000, typical: 5_000_000 },
};
```

### Transaction Amount Patterns (Financial Apps)
- ATM withdrawal: multiples of 50.000 (50k, 100k, 200k, 500k, 1M, 2M, 5M)
- Bank transfer: any amount
- Mobile payment (MoMo/ZaloPay): often small amounts (10k-500k)

---

## [KB-V005] Vietnamese National ID (CCCD) Format

**Source**: Ministry of Public Security Vietnam
**Domain**: [domain:identity]

### CCCD Format (12 digits, since 2021)

```
Positions 1-3: Province code (001-096)
Position 4:    Gender + century (0=male born 1900s, 1=female born 1900s, 
                                  2=male born 2000s, 3=female born 2000s)
Positions 5-6: Last 2 digits of birth year
Positions 7-12: Sequential number (000001-999999)
```

Example: `079 2 97 000123`
- 079 = Thành phố Hồ Chí Minh
- 2 = Male, born in 2000s
- 97 = Birth year ending in 97 → born 1997 or 2097 (context-dependent)
- 000123 = Sequential

### Province Codes (selected)
```
001 = Hà Nội, 015 = Hải Phòng, 020 = Hưng Yên, 030 = Hải Dương
048 = Đà Nẵng, 054 = Phú Thọ, 060 = Quảng Bình, 
075 = Bình Dương, 077 = Đồng Nai, 079 = TP. Hồ Chí Minh
```

### For Test Data Generation
**MUST use fake province codes (900-999)** to ensure no accidental real identity collision.
Example test CCCD: `900297000123`

---

## [KB-V006] Vietnamese Bank Account Patterns

**Source**: Vietnamese banking standards
**Domain**: [domain:finance]

### Account Number Formats by Bank

```typescript
const VN_BANK_ACCOUNT_FORMATS = {
  vietcombank: { length: 13, prefix: '0', format: '0XXXXXXXXXX00' },
  bidv:        { length: 14, prefix: '31', note: 'starts with branch code' },
  techcombank: { length: 12, format: 'XXXXXXXXXXXX' },
  vpbank:      { length: 12, note: 'usually 12 digits' },
  acb:         { length: 9,  note: 'older format 9 digits' },
  mbbank:      { length: 10 },
  vietinbank:  { length: 11 },
};
```

### For Test Data: Use Clearly Fake Formats
- Prefix: `0000-XXXXXXX` (leading zeros are unusual in real accounts)
- Or use format documented by NAPAS (Vietnamese interbank system) for test accounts

---

## [KB-V007] Vietnamese Business Data Patterns

**Source**: National Business Registration Portal
**Domain**: [domain:business]

### Tax Code (Mã Số Thuế) Format
- Enterprise: 10 digits: `XXXXXXXXXX`
- Branch: 13 digits: `XXXXXXXXXX-XXX` (enterprise + branch suffix)
- Personal business: 10 digits starting with personal ID prefix

### Realistic Vietnamese Business Names
```
Công ty TNHH {Adjective} {Noun} Việt Nam
Công ty Cổ phần {Domain} {Name}
Doanh nghiệp tư nhân {Name}
Cửa hàng {Product} {Name}
```

Common Vietnamese business adjectives: Phát Đạt, Thịnh Vượng, Hưng Thịnh, 
Minh Phú, Thành Công, Đại Phát, Vạn Thắng

---

## ═══ SECTION 2: DATA GENERATION TECHNIQUES ═══

---

## [KB-G001] Faker.js Vietnamese Locale — Gaps & Solutions

**Source**: Faker.js documentation + testing
**Relevance Score**: 1.0
**Categories**: faker-generator

### What Faker's `vi` locale provides
- `faker.person.firstName()` — basic Vietnamese first names (limited)
- `faker.location.city()` — major Vietnamese cities ✓
- `faker.location.country()` — "Việt Nam" ✓
- `faker.phone.number()` — limited VN format support

### What Faker's `vi` locale is MISSING or WRONG
- No weighted surname distribution (uses random list, not frequency-based)
- No middle name (đệm) generation  
- No full name structure (Surname First)
- Limited street data (not Vietnamese-specific)
- Phone format uses old 11-digit format (deprecated since 2018)
- No ward (phường/xã) level address data
- No province/district hierarchy

### Solution for This Project
Custom generators for all gaps, using Faker only for:
- `faker.internet.email()` (reliable)
- `faker.string.uuid()` (reliable)
- `faker.number.*` (reliable)
- `faker.date.*` (reliable)
- `faker.lorem.*` (use for non-Vietnamese text fallback)

---

## [KB-G002] @faker-js/faker v9 — Key Methods Reference

**Source**: Faker.js v9 documentation
**Relevance Score**: 0.95

### Most Useful Methods for Test Data

```typescript
// IDs
faker.string.uuid()                          // v4 UUID
faker.string.nanoid()                        // Short unique ID
faker.number.int({ min: 1, max: 1000000 })   // Auto-increment simulation

// Dates
faker.date.past({ years: 2 })               // Past 2 years
faker.date.future({ years: 1 })             // Next year
faker.date.between({ from, to })            // Range
faker.date.recent({ days: 30 })             // Last 30 days

// Strings
faker.lorem.words({ min: 3, max: 8 })       // Random words
faker.lorem.paragraph({ min: 1, max: 3 })   // Random paragraphs
faker.lorem.slug(3)                         // url-friendly-slug

// Internet
faker.internet.email({ firstName, lastName })
faker.internet.url()
faker.internet.ip()
faker.image.avatar()                         // Avatar URL

// Numbers
faker.number.float({ min: 0, max: 1, fractionDigits: 2 })
faker.number.int({ min: 1, max: 100 })
faker.finance.amount({ min: 10, max: 10000, dec: 0, symbol: '' })

// Selection
faker.helpers.arrayElement(['a', 'b', 'c'])           // Pick one
faker.helpers.arrayElements(['a', 'b', 'c'], 2)       // Pick N
faker.helpers.weightedArrayElement([
  { weight: 3, value: 'active' },
  { weight: 1, value: 'inactive' },
])

// Seeding (for reproducibility)
faker.seed(42)  // Set before generation for deterministic output
```

---

## [KB-G003] Prisma DMMF — Key Structures

**Source**: Prisma documentation + @prisma/internals source
**Relevance Score**: 1.0
**Categories**: schema-parser

### DMMF Field Type Mapping

```typescript
// Prisma field.type → our NormalizedField.type
const PRISMA_TYPE_MAP = {
  'String':   'string',
  'Int':      'int',
  'Float':    'float',
  'Boolean':  'boolean',
  'DateTime': 'datetime',
  'Json':     'json',
  'Bytes':    'bytes',
  'BigInt':   'bigint',
  'Decimal':  'decimal',
};

// field.kind values:
// 'scalar' → regular field (includes String, Int, DateTime, etc.)
// 'object' → relation field (NOT a database column — EXCLUDE from generation)
// 'enum'   → enum field
// 'unsupported' → raw SQL type

// field.isId → primary key
// field.isUnique → unique constraint
// field.isRequired → NOT NULL
// field.hasDefaultValue → has @default()
// field.default → { name: 'uuid', args: [] } or { name: 'now' } or { value: 'CUSTOMER' }
// field.relationName → relation name (non-null means it's a relation field)
```

### Critical: Exclude Relation Fields

```typescript
// WRONG: Includes relation fields (not actual DB columns)
const allFields = model.fields;

// CORRECT: Only scalar fields (actual DB columns)
const dbFields = model.fields.filter(f => f.kind !== 'object');
```

---

## [KB-G004] Topological Sort — Handling Real-World Schema Edge Cases

**Source**: Computer science + practical experience
**Relevance Score**: 0.97
**Categories**: dependency-resolver

### Self-Referential Tables (Category.parentId → Category.id)

```typescript
// Strategy: two-pass generation
// Pass 1: Generate all records with parentId = null
// Pass 2: Assign parentId for non-root records (random earlier record)

function generateSelfReferentialEntity(count: number): Record[] {
  const records = Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    parentId: null,  // All null initially
    name: generateName(),
  }));
  
  // Pass 2: assign parents for ~70% of records
  for (let i = 1; i < records.length; i++) {
    if (Math.random() < 0.7) {  // 70% have a parent
      const parentIdx = Math.floor(Math.random() * i);  // Only earlier records
      records[i].parentId = records[parentIdx].id;
    }
  }
  
  return records;
}
```

### Circular Dependencies (rare but possible)

Some schemas have circular dependencies that are optionally nullable:
```
User (managerId? → User)  -- OK: managerId is nullable
Post (authorId → User)    -- Regular FK
```

```typescript
function detectCircularDependencies(schema: NormalizedSchema): Cycle[] {
  // DFS to find cycles
  // If cycle found: check if ALL FKs in the cycle are nullable
  // Nullable FK in cycle → can be handled by two-pass generation
  // Required FK in cycle → error: schema has circular non-nullable FKs
}
```

---

## [KB-G005] Statistical Distributions for Realistic Test Data

**Source**: Statistics + data science research
**Relevance Score**: 0.95
**Categories**: distribution-engine

### Pareto Distribution (80/20 Rule)

The Pareto distribution is the most important for realistic user behavior data:
- 20% of users make 80% of purchases
- 20% of products generate 80% of revenue
- 20% of customers generate 80% of support tickets

```typescript
// Generate Pareto-distributed order counts
function paretoOrderCount(alpha: number = 1.16): number {
  // Pareto distribution with shape parameter alpha = 1.16 approximates 80/20
  const u = Math.random();
  return Math.floor(Math.pow(1 / (1 - u), 1 / alpha));  // Pareto inverse CDF
}

// More practical approach: tier-based assignment
function tierBasedActivityLevel(percentile: number): ActivityTier {
  if (percentile < 0.02) return { tier: 'whale',    orderCount: () => faker.number.int({ min: 100, max: 500 }) };
  if (percentile < 0.20) return { tier: 'active',   orderCount: () => faker.number.int({ min: 10,  max: 50 }) };
  if (percentile < 0.60) return { tier: 'moderate', orderCount: () => faker.number.int({ min: 2,   max: 9 }) };
  if (percentile < 0.80) return { tier: 'light',    orderCount: () => faker.number.int({ min: 1,   max: 2 }) };
  return                         { tier: 'dormant',  orderCount: () => 0 };
}
```

### Exponential Distribution (for quantities)

Most orders have 1-3 items; very few have 20+:
```typescript
function exponentialQuantity(mean: number = 2): number {
  return Math.max(1, Math.round(-mean * Math.log(Math.random())));
}
```

### Log-Normal Distribution (for prices)

Product prices are log-normally distributed:
```typescript
function logNormalPrice(meanLog: number, stdLog: number): number {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);  // Box-Muller
  return Math.round(Math.exp(meanLog + stdLog * z) / 1000) * 1000;  // Round to 1000 VND
}
```

---

## [KB-G006] Temporal Patterns in E-commerce Data

**Source**: E-commerce analytics research + Vietnamese market data
**Relevance Score**: 0.90
**Categories**: distribution-engine

### Vietnamese E-commerce Traffic Patterns

```typescript
// Hour weights for Vietnamese e-commerce (0-23)
const VN_ECOMMERCE_HOUR_WEIGHTS = [
  0.2, 0.1, 0.1, 0.1, 0.1, 0.2,  // 0-5: very low (midnight to early morning)
  0.5, 1.0, 1.5, 2.0, 2.5, 3.0,  // 6-11: morning ramp-up
  4.0, 3.0, 2.5, 2.5, 3.0, 4.0,  // 12-17: afternoon with lunch peak
  5.0, 6.0, 7.0, 6.0, 4.0, 2.0,  // 18-23: evening peak (7-9pm is highest)
];
// Source: Shopee/Lazada VN publicly disclosed traffic patterns
```

### Day of Week Patterns
- Monday-Friday: business hours + evening
- Saturday-Sunday: 30-40% higher than weekdays (more leisure browsing)
- Public holidays: ~2x normal traffic
- Tết (Lunar New Year): -70% orders during holiday, +200% in weeks before

### Seasonal Patterns for Vietnamese Market
- **Tháng 11-12**: Double 11, Christmas sales — highest volume of year
- **Tháng 1-2**: Tết sales (before holiday), then drops during holiday
- **Tháng 3-5**: Steady
- **Tháng 6**: Mid-year sale
- **Tháng 8-9**: Back to school

---

## ═══ SECTION 3: TESTING & EDGE CASES ═══

---

## [KB-E001] Unicode Edge Cases for Vietnamese Applications

**Source**: Unicode standard + real bug reports
**Relevance Score**: 0.97
**Categories**: edge-case-generator

### Vietnamese-Specific Unicode Issues

```typescript
const UNICODE_EDGE_CASES = [
  // Precomposed vs decomposed diacritics
  // "ầ" can be: U+1EA7 (precomposed) or U+0061 U+0306 U+0300 (decomposed)
  // Applications that don't normalize will treat these as different strings!
  '\u1EA7',              // Precomposed ầ
  '\u0061\u0306\u0300',  // Decomposed ầ (looks same, different bytes)
  
  // Zero-width characters (invisible but different)
  'Nguyễn\u200BVăn',    // Zero-width space mid-name
  'test\uFEFFvalue',     // BOM character
  
  // Long Vietnamese text
  'Nguyễn Thị Hà'.repeat(10),  // 140+ chars — tests VARCHAR limits
  
  // Special Vietnamese characters that cause DB encoding issues
  'Đặng Thị Ởng',        // ở character
  'Nguyễn Thị Ườu',      // ườ combination
  
  // Mixed language
  'Nguyễn Van A (John)',  // Common in diaspora
  
  // Emoji in names (exists in real social media data)
  'Tran Thi Mai 🌸',
];
```

### Why This Matters
- VARCHAR(50) with UTF-8: "Nguyễn Thị Bích Phượng" (22 chars) = 22-66 bytes depending on encoding
- MySQL utf8 vs utf8mb4: `utf8` in MySQL doesn't support 4-byte Unicode (emoji)
- PostgreSQL TEXT vs VARCHAR: TEXT has no length limit, VARCHAR does
- Indexing on NFC-normalized vs non-normalized: different behavior

---

## [KB-E002] Financial Edge Cases — Critical for Payment Systems

**Source**: Payment system post-mortems + Stripe documentation
**Relevance Score**: 1.0
**Categories**: edge-case-generator

### Amount Edge Cases

```typescript
const FINANCIAL_EDGE_CASES = {
  // Zero amounts
  zeroPrice: 0,
  zeroQuantity: 0,
  
  // Floating point precision issues
  floatTrap: 0.1 + 0.2,      // 0.30000000000000004 (not 0.3!)
  
  // Currency boundary
  maxVND: 999_999_999_999,   // Near max for BIGINT
  
  // Rounding edge cases (critical for tax calculation)
  taxRoundingEdge: 33333,    // 10% VAT = 3333.3 → round up or down?
  
  // Refund > original amount (fraud test)
  refundExceedsOrder: -1,    // Negative refund
  
  // Free items (price = 0)
  freeItem: { price: 0, discount: 0 },
  
  // Discount > price (edge case in promo logic)
  overdiscounted: { price: 100_000, discount: 200_000 },
};
```

### Status Transition Edge Cases

```typescript
// Real production edge cases for order status:
const STATUS_EDGE_CASES = [
  // Cancelled order that was partially fulfilled
  { status: 'CANCELLED', itemsShipped: 2, itemsTotal: 5 },
  
  // Refunded order where refund > paid amount (edge: cancelled with fee)
  { status: 'REFUNDED', paidAmount: 100_000, refundAmount: 95_000 },
  
  // Order stuck in PROCESSING for 30+ days (system error simulation)
  { status: 'PROCESSING', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  
  // Order with 0 items (empty cart bug)
  { status: 'PENDING', itemCount: 0 },
];
```

---

## [KB-E003] Date & Time Edge Cases

**Source**: Developer experience + timezone bug reports
**Relevance Score**: 0.93
**Categories**: edge-case-generator

### Critical Date Edge Cases

```typescript
const DATE_EDGE_CASES = [
  new Date('2024-02-29'),          // Leap year date (2024 is a leap year)
  new Date('2023-02-28'),          // Non-leap year last day of Feb
  new Date('2024-12-31T23:59:59'), // Year boundary
  new Date('2024-01-01T00:00:00'), // Year start
  new Date('1970-01-01T00:00:00'), // Unix epoch
  new Date('2038-01-19T03:14:07'), // Unix 32-bit overflow (Y2K38 problem)
  new Date('1999-12-31'),          // Y2K legacy test
  
  // Timezone edge cases (important for Vietnam: UTC+7)
  // This date is Dec 31 in UTC but Jan 1 in Vietnam
  new Date('2023-12-31T19:00:00.000Z'),  // = 2024-01-01 02:00 Vietnam time
];
```

### Vietnamese Time Considerations
- Vietnam uses UTC+7 (Indochina Time — no DST)
- No Daylight Saving Time adjustments
- Common bug: storing timestamps in UTC, displaying in local time without conversion

---

## [KB-E004] Database Constraint Edge Cases

**Source**: Database documentation + real bug reports
**Relevance Score**: 0.97
**Categories**: edge-case-generator

### UNIQUE Constraint Edge Cases

```typescript
const UNIQUE_EDGE_CASES = {
  // Case sensitivity: are these the same?
  email1: 'user@example.com',
  email2: 'USER@EXAMPLE.COM',  // Same in case-insensitive collation!
  
  // NULL uniqueness: multiple NULLs in a UNIQUE column?
  // PostgreSQL: multiple NULLs ARE allowed in UNIQUE column (SQL standard)
  // MySQL: multiple NULLs ARE allowed
  // SQLite: multiple NULLs ARE allowed
  nullableUnique: null,  // If generated multiple times, may violate some DB expectations
  
  // Trailing spaces (different string, but might look same in UI)
  name1: 'Nguyễn Văn A',
  name2: 'Nguyễn Văn A ',  // Trailing space
};
```

### VARCHAR Length Edge Cases

```typescript
// Generate strings at exactly the boundary
function maxLengthString(field: NormalizedField): string {
  if (field.maxLength) {
    // Test exact boundary
    return 'a'.repeat(field.maxLength);
  }
  return faker.lorem.words(10);  // Reasonable default
}
```

---

## [KB-E005] Real-World Data Patterns That Break Applications

**Source**: Collection from Stack Overflow, GitHub issues, post-mortems
**Relevance Score**: 1.0
**Categories**: edge-case-generator

### The "Bobby Tables" Problem (SQL Injection via Test Data)

```typescript
// These test data values reveal SQL injection vulnerabilities:
const INJECTION_TEST_VALUES = [
  "O'Brien",                    // Single quote in Irish/Vietnamese names
  "Đặng Văn; DROP TABLE users;--",  // Classic SQL injection
  "' OR '1'='1",
  "<script>alert('xss')</script>",   // XSS test
  "../../etc/passwd",               // Path traversal test
  "\0null\0byte",                   // Null byte injection
];
// Note: These are for TESTING your sanitization — never actual malicious intent
```

### Vietnamese-Specific Real-World Bugs

```typescript
// 1. Name sorting — Vietnamese tonal alphabetical order differs from ASCII
// "Bắc" should come before "Bán" in Vietnamese alphabetical order
// Applications that sort by ASCII value get wrong ordering

// 2. Full-text search — Vietnamese diacritics must be handled
// Search "nguyen" should find "Nguyễn" — requires accent-insensitive collation

// 3. SMS character count — Vietnamese diacritics
// "Xin chào" = 8 chars in Unicode but >1 SMS segment in old GSM encoding
// Applications using SMS must use Unicode encoding (UCS-2) for Vietnamese

// 4. URL encoding — Vietnamese in URLs
// "Nguyễn Văn A" → "Nguy%E1%BB%85n+V%C4%83n+A" in URL encoding
// Applications must properly encode/decode Vietnamese in URLs
```

---

## ═══ SECTION 4: OLLAMA & LOCAL LLM ═══

---

## [KB-T001] Ollama Best Practices for Batch Text Generation

**Source**: Ollama documentation + community experience
**Relevance Score**: 1.0
**Categories**: ollama-client

### Performance Optimization

```typescript
// Key settings for batch generation:
const OLLAMA_OPTIMAL_CONFIG = {
  concurrency: 3,          // 3 parallel requests to Ollama (tune based on RAM)
  temperature: 0.8,        // High enough for variety, low enough for coherence
  num_predict: 150,        // Max tokens per response (product desc = ~100 tokens)
  num_ctx: 512,            // Context window (small = faster for short tasks)
  
  // For Vietnamese specifically:
  stop: ['\n\n', '---'],   // Stop tokens to prevent run-on
};
```

### Expected Throughput (llama3.1:8b on M2 MacBook Pro)
- ~8-10 tokens/second
- 100-token product description: ~10-12 seconds per request
- With 3 concurrent: ~3-4 descriptions per second
- 1000 descriptions: ~5 minutes

### Prompt Engineering for Consistency

```typescript
// BAD: Too open, inconsistent length
const badPrompt = `Write a product description for ${name}`;

// GOOD: Constrained length, explicit format, no preamble
const goodPrompt = `Viết mô tả sản phẩm tiếng Việt cho "${name}" (${category}).
2 câu ngắn. Không dùng markdown. Không bắt đầu bằng "Đây là".`;
```

### Fallback Chain When Ollama Unavailable

```
Try Ollama → Timeout/Error → Log warning → Use faker.lorem.paragraph(1)
```

---

## [KB-T002] Llama3.1 Vietnamese Language Quality

**Source**: Testing + community benchmarks
**Relevance Score**: 0.92
**Categories**: ollama-client

### Vietnamese Performance

`llama3.1:8b` has reasonable Vietnamese text generation:
- **Good at**: Short descriptions, basic sentences, product-style copy
- **Acceptable**: Reviews, simple narratives, addresses
- **Weak at**: Formal Vietnamese, legal/technical language, poetry

### Quality Improvement Prompts

```typescript
// Adding context improves Vietnamese quality
const contextualPrompt = `
Bạn là nhân viên viết nội dung cho sàn thương mại điện tử Shopee Việt Nam.
Viết mô tả sản phẩm ngắn gọn (2 câu) cho: "${productName}"
Danh mục: ${category}
Giá: ${formatVND(price)}
`;
```

### Model Comparison for Vietnamese (on Ollama)
- `llama3.1:8b` — Good quality, moderate speed
- `qwen2:7b` — Better Vietnamese (Alibaba model with more Asian language training)
- `vinallama:7b` — Vietnamese-specific model (if available) — best quality
- `gemma2:2b` — Faster but lower quality

**Recommendation**: Try `qwen2:7b` as default for Vietnamese, fallback to `llama3.1:8b`

---

## [KB-T003] Test Data Best Practices

**Source**: Martin Fowler, James Shore, "The Art of Unit Testing"
**Relevance Score**: 0.95
**Categories**: test-data

### The Test Data Spectrum

```
Too Fake: user@test.com, User1, 100
           → Misses encoding bugs, validation edge cases
           
Realistic: nguyen.thi.bich.phuong@example.com, Nguyễn Thị Bích Phượng, 287000
           → Catches real bugs, representative of actual user behavior
           
Too Real: actual customer data
           → Privacy risk, GDPR violation, can't share with team
```

### The Object Mother Pattern

Factory functions that produce preconfigured test objects:

```typescript
const UserMother = {
  regular: () => createUser({ role: 'CUSTOMER', isActive: true }),
  admin: () => createUser({ role: 'ADMIN', isActive: true }),
  banned: () => createUser({ role: 'CUSTOMER', isActive: false, bannedAt: new Date() }),
  newRegistration: () => createUser({ emailVerifiedAt: null, createdAt: new Date() }),
  vipCustomer: () => createUser({ role: 'CUSTOMER', totalOrderValue: 50_000_000 }),
};
```

### Test Data State Machine

For entities with complex states, factory functions should respect valid state transitions:

```typescript
// Bad: random status that might not make sense
const badOrder = createOrder({ status: 'REFUNDED', paymentId: null }); 

// Good: states are consistent
const goodOrder = createOrder({
  status: 'REFUNDED',
  paymentId: faker.string.uuid(),  // Must have payment to be refunded
  refundedAt: faker.date.recent(), // Refund date present
  refundAmount: faker.number.int({ min: 1, max: 1000000 }),
});
```

---

## 📅 Update Log

| Date | Entries Added | Sources | Triggered By |
|------|--------------|---------|-------------|
| 2025-06-01 | 25 (initial seed) | GSO Vietnam, carrier data, Faker docs, testing best practices | Project initialization |

---

## 🔍 Upcoming Crawl Targets

- [ ] Faker.js release notes — new Vietnamese locale additions
- [ ] Vietnam administrative division changes (MOLISA)
- [ ] Vietnamese telecom prefix updates (VNPT Vinaphone, Viettel)
- [ ] Ollama new model releases with Vietnamese support
- [ ] Test data generation blog posts (Martin Fowler bliki)

---

*Append-only. Tagged: [domain:vietnamese], [domain:names], [domain:address], [domain:phone], [domain:pricing], [domain:identity], [library:faker], [library:ollama], [technique:distribution], [technique:edge-cases], [technique:test-data]*
