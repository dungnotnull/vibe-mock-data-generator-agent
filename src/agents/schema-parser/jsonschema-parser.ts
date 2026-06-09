/**
 * JSON Schema Parser
 * Parses JSON Schema definitions into NormalizedSchema
 */

import type { NormalizedSchema, NormalizedEntity, NormalizedField, FieldType } from '../../types/index.js';

const JSON_SCHEMA_TYPE_MAP: Record<string, FieldType> = {
  string: 'string',
  integer: 'int',
  number: 'float',
  boolean: 'boolean',
  array: 'json',
  object: 'json',
  null: 'string',
};

/**
 * Parse a JSON Schema document into NormalizedSchema.
 * Each top-level property in the schema is treated as an entity.
 * Supports: $defs, definitions, and inline schemas.
 */
export async function parseJSONSchemaSchema(sourceText: string): Promise<NormalizedSchema> {
  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(sourceText);
  } catch {
    throw new Error('Invalid JSON Schema: failed to parse JSON');
  }

  const entities: NormalizedEntity[] = [];
  const enums: NormalizedSchema['enums'] = [];

  // Find top-level definitions
  const definitions = (schema.$defs ?? schema.definitions ?? schema.properties ?? {}) as Record<string, unknown>;

  for (const [entityName, entityDef] of Object.entries(definitions)) {
    const def = entityDef as Record<string, unknown>;
    if (typeof def !== 'object' || def === null) continue;

    // Only process objects (entities)
    if (def.type !== 'object' && !def.properties) continue;

    const properties = (def.properties ?? {}) as Record<string, Record<string, unknown>>;
    const required = (def.required ?? []) as string[];
    const fields: NormalizedField[] = [];
    let primaryKey = 'id';

    for (const [propName, propDef] of Object.entries(properties)) {
      const isRequired = required.includes(propName);
      const jsonType = (propDef.type ?? 'string') as string;
      
      // Handle $ref
      if (propDef.$ref) {
        const refPath = propDef.$ref as string;
        const refName = refPath.split('/').pop() ?? '';
        fields.push({
          name: propName,
          type: 'uuid',
          isRequired,
          isUnique: false,
          isAutoIncrement: false,
          isForeignKey: true,
          referencedEntity: refName,
          referencedField: 'id',
          isNullable: !isRequired,
        });
        continue;
      }

      // Handle enum
      if (propDef.enum && Array.isArray(propDef.enum)) {
        const enumValues = propDef.enum.map(String);
        enums.push({ name: entityName + '_' + propName, values: enumValues });
        fields.push({
          name: propName,
          type: 'enum',
          isRequired,
          isUnique: false,
          isAutoIncrement: false,
          enumValues,
          isForeignKey: false,
          isNullable: !isRequired,
        });
        continue;
      }

      // Handle format-based type inference
      let fieldType: FieldType = JSON_SCHEMA_TYPE_MAP[jsonType] ?? 'string';
      let maxLength: number | undefined;

      if (propDef.format === 'uuid' || propDef.format === 'date-time') {
        fieldType = propDef.format === 'uuid' ? 'uuid' : 'datetime';
      } else if (propDef.format === 'date') {
        fieldType = 'date';
      } else if (propDef.format === 'email' || propDef.format === 'uri') {
        fieldType = 'string';
      } else if (propDef.maxLength && typeof propDef.maxLength === 'number') {
        maxLength = propDef.maxLength;
        // VARCHAR(36) → UUID heuristic
        if (maxLength === 36) {
          fieldType = 'uuid';
        }
      }

      // Check for ID-like field names
      if (propName === 'id' || propName.endsWith('_id') || propName.endsWith('Id')) {
        if (fieldType === 'string') fieldType = 'uuid';
        if (propName === 'id') primaryKey = propName;
      }

      fields.push({
        name: propName,
        type: fieldType,
        isRequired,
        isUnique: propName === 'id' || propName.endsWith('_id') ? true : (propDef.unique as boolean ?? false),
        isAutoIncrement: false,
        maxLength,
        isForeignKey: false,
        isNullable: !isRequired,
        defaultValue: propDef.default,
      });
    }

    if (fields.length > 0) {
      entities.push({
        name: entityName.charAt(0).toUpperCase() + entityName.slice(1),
        tableName: entityName.toLowerCase() + 's',
        fields,
        primaryKey,
        indexes: [],
      });
    }
  }

  return { entities, relations: [], enums, source: 'jsonschema' };
}
