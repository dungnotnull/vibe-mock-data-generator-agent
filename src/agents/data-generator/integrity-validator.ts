/**
 * Integrity Validator - Post-generation constraint verification
 * Ensures all generated data is referentially valid before output
 */

import type { NormalizedSchema, NormalizedEntity, NormalizedField, GeneratedRecord } from '../../types/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  entity: string;
  field: string;
  recordIndex: number;
  type: 'fk_violation' | 'not_null_violation' | 'unique_violation' | 'enum_violation' | 'maxlength_violation';
  message: string;
  value: unknown;
}

export interface ValidationWarning {
  entity: string;
  field: string;
  message: string;
}

export function validateIntegrity(
  schema: NormalizedSchema,
  data: Map<string, GeneratedRecord[]>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const entity of schema.entities) {
    const records = data.get(entity.name) ?? [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const isEdgeCase = (record as Record<string, unknown>).__edgeCase !== undefined;

      for (const field of entity.fields) {
        const value = record[field.name];

        // NOT NULL validation — skip for intentional edge case null injections
        if (field.isRequired && !field.isAutoIncrement && value === null) {
          if (isEdgeCase) continue;
          errors.push({
            entity: entity.name,
            field: field.name,
            recordIndex: i,
            type: 'not_null_violation',
            message: 'NOT NULL violation: ' + entity.name + '.' + field.name + ' is null at record ' + i,
            value,
          });
        }

        // Foreign key validation
        if (field.isForeignKey && field.referencedEntity && value !== null && value !== undefined) {
          const parentRecords = data.get(field.referencedEntity) ?? [];
          const parentField = field.referencedField ?? 'id';
          const parentValues = parentRecords.map(r => r[parentField]);
          if (!parentValues.includes(value)) {
            errors.push({
              entity: entity.name,
              field: field.name,
              recordIndex: i,
              type: 'fk_violation',
              message: 'FK violation: ' + entity.name + '.' + field.name + '=' + String(value) + ' does not exist in ' + field.referencedEntity + '.' + parentField,
              value,
            });
          }
        }

        // Enum validation
        if (field.type === 'enum' && field.enumValues && value !== null && value !== undefined) {
          if (!field.enumValues.includes(value as string)) {
            errors.push({
              entity: entity.name,
              field: field.name,
              recordIndex: i,
              type: 'enum_violation',
              message: 'Enum violation: ' + entity.name + '.' + field.name + '="' + String(value) + '" not in [' + field.enumValues.join(', ') + ']',
              value,
            });
          }
        }

        // MaxLength validation — skip for intentional edge case injections
        if (field.maxLength && typeof value === 'string') {
          if (value.length > field.maxLength) {
            if (isEdgeCase) continue;
            errors.push({
              entity: entity.name,
              field: field.name,
              recordIndex: i,
              type: 'maxlength_violation',
              message: 'MaxLength violation: ' + entity.name + '.' + field.name + ' length ' + value.length + ' > ' + field.maxLength,
              value,
            });
          }
        }
      }
    }

    // UNIQUE validation
    const uniqueFields = entity.fields.filter(f => f.isUnique);
    for (const field of uniqueFields) {
      const values = records.map(r => r[field.name]);
      const seen = new Map<unknown, number>();
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v === null || v === undefined) continue;
        if (seen.has(v)) {
          errors.push({
            entity: entity.name,
            field: field.name,
            recordIndex: i,
            type: 'unique_violation',
            message: 'UNIQUE violation: ' + entity.name + '.' + field.name + '="' + String(v) + '" is duplicated',
            value: v,
          });
        }
        seen.set(v, i);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
