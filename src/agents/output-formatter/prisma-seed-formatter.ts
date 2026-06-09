/**
 * Prisma Seed Script Formatter
 * Generates executable TypeScript seed scripts for Prisma
 */

import type { GeneratedRecord } from '../../types/index.js';

export function formatPrismaSeed(
  data: Map<string, GeneratedRecord[]>,
  seedOrder: string[],
): string {
  const totalRecords = Array.from(data.values()).reduce((sum, records) => sum + records.length, 0);
  const timestamp = new Date().toISOString();

  const deleteStatements = seedOrder
    .slice()
    .reverse()
    .map(entity => '  await prisma.' + toCamelCase(entity) + '.deleteMany({});')
    .join('\n');

  const seedStatements = seedOrder
    .map(entity => {
      const records = data.get(entity) ?? [];
      return formatEntitySeed(entity, records);
    })
    .join('\n\n');

  const statsLines = Array.from(data.entries())
    .map(([entity, records]) => '  //   ' + entity + ': ' + records.length + ' records')
    .join('\n');

  return '// @generated-mock-data -- DO NOT USE IN PRODUCTION\n' +
    '// Generated: ' + timestamp + '\n' +
    '// Records: ' + totalRecords + ' total\n\n' +
    "import { PrismaClient } from '@prisma/client';\n\n" +
    'const prisma = new PrismaClient();\n\n' +
    'async function main() {\n' +
    "  console.log('\\u{1F331} Seeding database...');\n\n" +
    '  // Clean existing data (in reverse dependency order)\n' +
    deleteStatements + '\n\n' +
    '  // Seed in dependency order\n' +
    seedStatements + '\n\n' +
    "  console.log('\\u2705 Database seeded successfully');\n" +
    "  console.log('\\u{1F4CA} Statistics:');\n" +
    statsLines + '\n}\n\n' +
    'main()\n' +
    '  .then(async () => { await prisma.$disconnect(); })\n' +
    "  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });\n";
}

function formatEntitySeed(entity: string, records: GeneratedRecord[]): string {
  const cleanRecords = records.map(r => {
    const { __edgeCase, ...rest } = r as Record<string, unknown>;
    return rest;
  });

  // Handle Date objects in JSON serialization
  const jsonStr = JSON.stringify(cleanRecords, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  }, 2)
    .split('\n')
    .map((line, i) => i === 0 ? line : '    ' + line)
    .join('\n');

  return '  // ' + entity + ': ' + records.length + ' records\n' +
    '  await prisma.' + toCamelCase(entity) + '.createMany({\n' +
    '    data: ' + jsonStr + ',\n' +
    '    skipDuplicates: true,\n' +
    '  });\n' +
    "  console.log('  \\u2713 " + entity + ': ' + records.length + " records');";
}

function toCamelCase(str: string): string {
  // Handle snake_case and PascalCase -> camelCase
  return str
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}
