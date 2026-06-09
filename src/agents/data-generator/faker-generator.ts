/**
 * Faker Generator - Core structured data generation using @faker-js/faker
 * Handles all Faker-based field strategies with unique constraint tracking
 */

import { faker } from '@faker-js/faker/locale/vi';
import type { FieldStrategy, GeneratedRecord, NormalizedField } from '../../types/index.js';

// Track unique values per field to avoid collisions
const uniqueTracker = new Map<string, Set<unknown>>();

export function resetUniqueTracker(): void {
  uniqueTracker.clear();
}

export function generateFakerValue(
  strategy: FieldStrategy,
  field: NormalizedField,
  index: number,
  seededFaker: typeof faker,
): unknown {
  const fakerMethod = strategy.params?.['fakerMethod'] as string | undefined;

  // If field is unique, use unique value generation
  if (field.isUnique) {
    return generateUniqueValue(
      field.name,
      field.name,
      () => generateFakerValueInternal(fakerMethod, field, seededFaker),
    );
  }

  return generateFakerValueInternal(fakerMethod, field, seededFaker);
}

function generateFakerValueInternal(
  fakerMethod: string | undefined,
  field: NormalizedField,
  f: typeof faker,
): unknown {
  switch (fakerMethod) {
    // IDs
    case 'string.uuid':
      return f.string.uuid();

    // Internet
    case 'internet.email':
      return f.internet.email({ provider: 'example.com' });
    case 'internet.url':
      return f.internet.url();
    case 'internet.userName':
      return f.internet.username();

    // Text
    case 'lorem.word':
      return f.lorem.word();
    case 'lorem.words':
      return f.lorem.words({ min: 2, max: 6 });
    case 'lorem.paragraph':
      return f.lorem.paragraph();
    case 'lorem.sentence':
      return f.lorem.sentence();

    // Numbers
    case 'number.int': {
      const min = field.minValue ?? 1;
      const max = field.maxValue ?? 1000000;
      return f.number.int({ min, max });
    }
    case 'number.float':
      return f.number.float({ min: 0, max: 10000, fractionDigits: 2 });

    // Boolean
    case 'datatype.boolean':
      return f.datatype.boolean();

    // Dates
    case 'date.recent':
      return f.date.recent({ days: 365 });
    case 'date.past':
      return f.date.past({ years: 2 });
    case 'date.between': {
      const from = '2023-01-01';
      const to = '2025-12-31';
      return f.date.between({ from, to });
    }

    default:
      return generateByFieldType(field, f);
  }
}

function generateByFieldType(field: NormalizedField, f: typeof faker): unknown {
  switch (field.type) {
    case 'string':
      if (field.maxLength && field.maxLength <= 10) return f.lorem.word();
      return f.lorem.words({ min: 2, max: 5 });
    case 'int':
      return f.number.int({ min: 1, max: 1000000 });
    case 'float':
    case 'decimal':
      return f.number.float({ min: 0, max: 100000, fractionDigits: 2 });
    case 'boolean':
      return f.datatype.boolean();
    case 'datetime':
    case 'date':
      return f.date.recent({ days: 365 });
    case 'uuid':
      return f.string.uuid();
    case 'enum':
      if (field.enumValues && field.enumValues.length > 0) {
        return f.helpers.arrayElement(field.enumValues);
      }
      return f.lorem.word();
    case 'json':
      return {};
    case 'bytes':
      return Buffer.alloc(0);
    case 'bigint':
      return BigInt(f.number.int({ min: 1, max: 1000000 }));
    default:
      return f.lorem.word();
  }
}

export function generateUniqueValue(
  entityName: string,
  fieldName: string,
  generator: () => unknown,
): unknown {
  const key = entityName + '.' + fieldName;
  let tracker = uniqueTracker.get(key);
  if (!tracker) {
    tracker = new Set();
    uniqueTracker.set(key, tracker);
  }

  let attempts = 0;
  let value = generator();
  while (tracker.has(value as string | number) && attempts < 100) {
    value = generator();
    attempts++;
  }

  tracker.add(value as string | number);
  return value;
}

export function pickFkValue(
  parentRecords: GeneratedRecord[],
  parentField: string,
  seededFaker: typeof faker,
): unknown {
  if (parentRecords.length === 0) {
    throw new Error('Cannot pick FK value: parent entity has no records');
  }
  const record = seededFaker.helpers.arrayElement(parentRecords);
  return record[parentField];
}
