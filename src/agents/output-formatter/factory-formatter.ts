/**
 * Factory Function Formatter
 * Generates reusable TypeScript factory functions for test suites
 */

import type { NormalizedEntity, NormalizedField, DomainContext } from '../../types/index.js';

export function formatFactoryFunctions(
  entities: NormalizedEntity[],
  domain: DomainContext,
): string {
  const timestamp = new Date().toISOString();
  const header = "// @generated-mock-data -- DO NOT USE IN PRODUCTION\n// Factory functions for test data generation\n// Generated: " + timestamp + "\n\nimport { faker } from '@faker-js/faker/locale/vi';\n";

  const typeDefinitions = entities.map(entity => {
    const fields = entity.fields
      .filter(f => !f.isAutoIncrement)
      .map(f => '  ' + f.name + ': ' + tsType(f.type) + (f.isNullable ? ' | null' : '') + ';');
    return 'export type ' + entity.name + ' = {\n' + fields.join('\n') + '\n};';
  }).join('\n\n');

  const overrideTypes = entities.map(entity => {
    const fields = entity.fields
      .filter(f => !f.isAutoIncrement)
      .map(f => '  ' + f.name + '?: ' + tsType(f.type) + (f.isNullable ? ' | null' : '') + ';');
    return 'export type ' + entity.name + 'Override = Partial<{\n' + fields.join('\n') + '\n}>';
  }).join('\n');

  const factories = entities.map(entity => generateFactoryForEntity(entity, domain)).join('\n\n');

  return header + '\n' + typeDefinitions + '\n\n' + overrideTypes + '\n\n// ─── Factory Functions ─────────────────────────────────────\n\n' + factories;
}

function generateFactoryForEntity(entity: NormalizedEntity, domain: DomainContext): string {
  const name = entity.name;

  const fieldGenerators = entity.fields
    .filter(f => !f.isAutoIncrement)
    .map(f => '    ' + f.name + ': ' + defaultGeneratorExpression(f, domain) + ',')
    .join('\n');

  return (
    "export function create" + name + "(overrides: " + name + "Override = {}): " + name + " {\n" +
    "  return {\n" +
    fieldGenerators + "\n" +
    "    ...overrides,\n" +
    "  };\n" +
    "}\n\n" +
    "export function create" + name + "s(count: number, overrides: " + name + "Override = {}): " + name + "[] {\n" +
    "  return Array.from({ length: count }, () => create" + name + "(overrides));\n" +
    "}"
  );
}

function defaultGeneratorExpression(field: NormalizedField, domain: DomainContext): string {
  // Vietnamese-specific field name detection
  if (domain.market === 'vietnam') {
    const lower = field.name.toLowerCase();
    if (lower.includes('email') || lower.includes('e-mail')) return "faker.internet.email({ provider: 'example.com' })";
    if (lower.includes('phone') || lower.includes('dien_thoai') || lower.includes('so_dt')) return "faker.phone.number('09########')";
    if (lower.includes('name') || lower.includes('ho_ten') || lower === 'fullname' || lower === 'full_name') return "faker.person.fullName()";
    if (lower.includes('address') || lower.includes('dia_chi')) return "faker.location.streetAddress({ useFullAddress: true })";
    if (lower.includes('city') || lower.includes('thanh_pho')) return "faker.location.city()";
  }

  // Primary key detection
  if (field.name === 'id' || field.isUnique) {
    if (field.type === 'uuid') return 'faker.string.uuid()';
    if (field.type === 'int') return 'faker.number.int({ min: 1, max: 1000000 })';
  }

  switch (field.type) {
    case 'uuid': return 'faker.string.uuid()';
    case 'string':
      if (field.maxLength && field.maxLength <= 50) return "faker.lorem.word()";
      return "faker.lorem.words({ min: 2, max: 6 })";
    case 'int': return 'faker.number.int({ min: 1, max: 1000000 })';
    case 'float': return 'faker.number.float({ min: 0, max: 10000, fractionDigits: 2 })';
    case 'decimal': return 'faker.number.float({ min: 0, max: 100000, fractionDigits: 2 })';
    case 'boolean': return 'faker.datatype.boolean()';
    case 'datetime': return 'faker.date.recent({ days: 365 })';
    case 'date': return 'faker.date.recent({ days: 365 })';
    case 'enum':
      if (field.enumValues && field.enumValues.length > 0) {
        return 'faker.helpers.arrayElement(' + JSON.stringify(field.enumValues) + ')';
      }
      return "'unknown'";
    case 'json': return '{} as Record<string, unknown>';
    case 'bigint': return 'BigInt(faker.number.int({ min: 1, max: 1000000 }))';
    case 'bytes': return "Buffer.from('mock-data')";
    default: return 'faker.lorem.word()';
  }
}

function tsType(fieldType: string): string {
  switch (fieldType) {
    case 'string': return 'string';
    case 'int': case 'bigint': return 'number';
    case 'float': case 'decimal': return 'number';
    case 'boolean': return 'boolean';
    case 'datetime': case 'date': return 'Date';
    case 'uuid': return 'string';
    case 'enum': return 'string';
    case 'json': return 'Record<string, unknown>';
    case 'bytes': return 'Buffer';
    default: return 'unknown';
  }
}
