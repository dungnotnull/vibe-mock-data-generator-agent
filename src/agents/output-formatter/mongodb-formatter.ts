/**
 * MongoDB Seed Script Formatter
 * Generates executable TypeScript seed scripts for MongoDB
 * Produces a script that uses the mongodb driver directly for seeding
 */

import type { GeneratedRecord } from '../../types/index.js';

export function formatMongoDBSeed(
  data: Map<string, GeneratedRecord[]>,
  seedOrder: string[],
): string {
  const totalRecords = Array.from(data.values()).reduce((sum, records) => sum + records.length, 0);
  const timestamp = new Date().toISOString();

  const deleteStatements = seedOrder
    .slice()
    .reverse()
    .map(entity => {
      const collectionName = toSnakeCase(entity);
      return '  await db.collection(\'' + collectionName + '\').deleteMany({});';
    })
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
    '// Records: ' + totalRecords + ' total\n' +
    '// Target: MongoDB\n\n' +
    "import { MongoClient } from 'mongodb';\n\n" +
    'const uri = process.env.MONGODB_URI || \'mongodb://localhost:27017\';\n' +
    'const dbName = process.env.MONGODB_DB || \'' + 'mockdata' + '\';\n\n' +
    'const client = new MongoClient(uri);\n\n' +
    'async function main() {\n' +
    "  console.log('\\u{1F331} Seeding MongoDB database...');\n" +
    '  await client.connect();\n' +
    '  const db = client.db(dbName);\n\n' +
    '  // Clean existing data (in reverse dependency order)\n' +
    deleteStatements + '\n\n' +
    '  // Seed in dependency order\n' +
    seedStatements + '\n\n' +
    "  console.log('\\u2705 MongoDB seeded successfully');\n" +
    "  console.log('\\u{1F4CA} Statistics:');\n" +
    statsLines + '\n}\n\n' +
    'main()\n' +
    "  .then(async () => { await client.close(); })\n" +
    "  .catch(async (e) => { console.error(e); await client.close(); process.exit(1); });\n";
}

function formatEntitySeed(entity: string, records: GeneratedRecord[]): string {
  const cleanRecords = records.map(r => {
    const { __edgeCase, ...rest } = r as Record<string, unknown>;
    return transformForMongo(rest);
  });

  // Format as MongoDB documents — use _id instead of id, snake_case keys
  const jsonStr = JSON.stringify(cleanRecords, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  }, 2)
    .split('\n')
    .map((line, i) => i === 0 ? line : '    ' + line)
    .join('\n');

  const collectionName = toSnakeCase(entity);

  return '  // ' + entity + ': ' + records.length + ' records\n' +
    '  await db.collection(\'' + collectionName + '\').insertMany(\n' +
    '    ' + jsonStr + ',\n' +
    '    { ordered: false }\n' +
    '  );\n' +
    "  console.log('  \\u2713 " + entity + ': ' + records.length + " records');";
}

/**
 * Transform a record for MongoDB compatibility:
 * - Rename 'id' field to '_id' (if UUID-like)
 * - Convert camelCase keys to snake_case
 */
function transformForMongo(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === 'id') {
      // Use 'id' field value as MongoDB '_id'
      result['_id'] = value;
    } else {
      result[toSnakeCase(key)] = value;
    }
  }

  return result;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '')
    .replace(/([a-z\d])([A-Z])/g, '')
    .toLowerCase();
}
