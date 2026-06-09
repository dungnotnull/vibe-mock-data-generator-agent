/**
 * Edge Case Generator — Injects realistic edge cases into generated data
 * Produces boundary values, unicode issues, null values, and constraint-violating data
 *
 * IMPORTANT: Uses faker (not Math.random) for deterministic --seed mode.
 */

import type { NormalizedEntity, NormalizedField, EdgeCaseScenario, GeneratedRecord, EdgeCaseConfig } from '../../types/index.js';
import { faker } from '@faker-js/faker/locale/vi';

const UNICODE_EDGE_CASES = [
  '\u1EA7',                              // Precomposed ầ
  '\u0061\u0306\u0300',                  // Decomposed ầ (same visual, different bytes)
  'Nguy\u1EC5n V\u0103n A',             // Vietnamese name with diacritics
  'Nguy\u1EC5n Th\u1ECB \u1EBE\u01A0',  // Unusual diacritics
  'Jos\u00E9 Garc\u00EDa L\u00F3pez',   // Latin extended
  '\u7530\u4E2D \u592A\u90CE',           // East Asian
  'Nguy\u1EC5n V\u0103n A\u200B',       // Zero-width space
  'test\uFEFFvalue',                     // BOM character
  'O\u0027Brien',                        // Single quote in name
  '\u0645\u062D\u0645\u062F \u0639\u0644\u064A', // Arabic RTL
];

const INJECTION_TEST_STRINGS = [
  "O'Brien",
  "'; DROP TABLE users;--",
  "' OR '1'='1",
  '<script>alert("xss")</script>',
  '../../etc/passwd',
  '\0null\0byte',
];

export function injectEdgeCases(
  records: GeneratedRecord[],
  entity: NormalizedEntity,
  config: EdgeCaseConfig,
): GeneratedRecord[] {
  if (!config.enabled || records.length === 0) return records;

  const edgeCaseCount = Math.max(1, Math.floor(records.length * config.percentage / 100));

  // Pick random indices to become edge cases using faker
  const indices = new Set<number>();
  const maxAttempts = edgeCaseCount * 3;
  let attempts = 0;
  while (indices.size < Math.min(edgeCaseCount, records.length) && attempts < maxAttempts) {
    indices.add(faker.number.int({ min: 0, max: records.length - 1 }));
    attempts++;
  }

  return records.map((record, index) => {
    if (!indices.has(index)) return record;
    const scenario = faker.helpers.arrayElement(config.scenarios);
    return applyEdgeCaseScenario(record, entity, scenario);
  });
}

function applyEdgeCaseScenario(
  record: GeneratedRecord,
  entity: NormalizedEntity,
  scenario: EdgeCaseScenario,
): GeneratedRecord {
  const modified = { ...record };

  switch (scenario) {
    case 'null-nullable-fields':
      for (const field of entity.fields) {
        if (field.isNullable && !field.isForeignKey) {
          if (faker.datatype.boolean()) {
            modified[field.name] = null;
          }
        }
      }
      break;

    case 'max-length-strings':
      for (const field of entity.fields) {
        if (field.isUnique || field.isForeignKey) continue;
        if (field.type === 'string' && field.maxLength) {
          const char = '\u0103'; // ă - 2-byte UTF-8
          modified[field.name] = char.repeat(Math.ceil(field.maxLength / 2));
        }
      }
      break;

    case 'boundary-dates':
      for (const field of entity.fields) {
        if (field.type === 'datetime' || field.type === 'date') {
          const boundaries = [
            new Date('2024-02-29'),
            new Date('2024-12-31T23:59:59.999Z'),
            new Date('1970-01-01T00:00:00.000Z'),
            new Date('2038-01-19T03:14:07.000Z'),
          ];
          modified[field.name] = faker.helpers.arrayElement(boundaries);
        }
      }
      break;

    case 'unicode-names':
      for (const field of entity.fields) {
        if (field.isUnique) continue;
        if (field.name.toLowerCase().includes('name') && field.type === 'string') {
          modified[field.name] = faker.helpers.arrayElement(UNICODE_EDGE_CASES);
        }
      }
      break;

    case 'zero-amounts':
      for (const field of entity.fields) {
        if ((field.type === 'int' || field.type === 'float' || field.type === 'decimal') &&
            (field.name.toLowerCase().includes('price') || field.name.toLowerCase().includes('amount') || field.name.toLowerCase().includes('total'))) {
          modified[field.name] = 0;
        }
      }
      break;

    case 'negative-amounts':
      for (const field of entity.fields) {
        if ((field.type === 'int' || field.type === 'float' || field.type === 'decimal') &&
            (field.name.toLowerCase().includes('price') || field.name.toLowerCase().includes('amount'))) {
          modified[field.name] = -(faker.number.int({ min: 1, max: 1000 }));
        }
      }
      break;

    case 'empty-strings':
      for (const field of entity.fields) {
        if (field.isRequired || field.isUnique) continue;
        if (field.type === 'string') {
          modified[field.name] = '';
        }
      }
      break;

    case 'sql-injection-strings':
      for (const field of entity.fields) {
        if (field.isUnique) continue;
        if (field.type === 'string' && (field.name.toLowerCase().includes('name') || field.name.toLowerCase().includes('description') || field.name.toLowerCase().includes('note'))) {
          modified[field.name] = faker.helpers.arrayElement(INJECTION_TEST_STRINGS);
        }
      }
      break;

    case 'duplicate-attempt':
      modified['__edgeCase'] = 'duplicate-attempt';
      break;

    case 'inactive-deleted-simultaneous':
      for (const field of entity.fields) {
        const lowerName = field.name.toLowerCase();
        if ((lowerName.includes('active') || lowerName.includes('is_active')) && field.type === 'boolean') {
          modified[field.name] = true;
        }
        if (lowerName.includes('deleted') || lowerName.includes('deleted_at')) {
          modified[field.name] = new Date();
        }
      }
      break;
  }

  return modified;
}
