/**
 * SQL DDL Parser
 * Parses PostgreSQL and MySQL DDL into NormalizedSchema
 * 
 * KEY FIXES:
 * 1. VARCHAR(36) mapped to UUID type for referential integrity
 * 2. FK inference from _id suffix with smart entity matching
 * 3. Lenient regex for CREATE TABLE (no semicolons required)
 * 4. FK referencedField normalized to match actual entity field names (case-insensitive)
 */

import type { NormalizedSchema, NormalizedEntity, NormalizedField, FieldType } from '../../types/index.js';

const SQL_TYPE_MAP: Record<string, FieldType> = {
  varchar: 'string',
  text: 'string',
  'character varying': 'string',
  char: 'string',
  integer: 'int',
  int: 'int',
  smallint: 'int',
  bigint: 'bigint',
  serial: 'int',
  bigserial: 'bigint',
  numeric: 'decimal',
  decimal: 'decimal',
  real: 'float',
  'double precision': 'float',
  float: 'float',
  boolean: 'boolean',
  bool: 'boolean',
  date: 'date',
  timestamp: 'datetime',
  'timestamp without time zone': 'datetime',
  'timestamp with time zone': 'datetime',
  uuid: 'uuid',
  json: 'json',
  jsonb: 'json',
  bytea: 'bytes',
  tinyint: 'int',
  mediumint: 'int',
  datetime: 'datetime',
  longtext: 'string',
  mediumtext: 'string',
  tinytext: 'string',
  blob: 'bytes',
};

function pluralizeEntityName(name: string): string {
  if (name.endsWith('s')) return name;
  if (name.endsWith('y') && !name.endsWith('ay') && !name.endsWith('ey')) return name.slice(0, -1) + 'ies';
  if (name.endsWith('ch') || name.endsWith('sh') || name.endsWith('x')) return name + 'es';
  return name + 's';
}

function findMatchingEntity(inferredName: string, entityNames: string[]): string | undefined {
  // Direct match (case-insensitive)
  const exact = entityNames.find(e => e.toLowerCase() === inferredName.toLowerCase());
  if (exact) return exact;
  
  // Try pluralizing the inferred name
  const pluralized = pluralizeEntityName(inferredName);
  const plural = entityNames.find(e => e.toLowerCase() === pluralized.toLowerCase());
  if (plural) return plural;
  
  // Try singular (strip trailing 's')
  const singular = entityNames.find(e => e.toLowerCase() === inferredName.toLowerCase().replace(/s$/, ''));
  if (singular) return singular;
  
  return undefined;
}

/**
 * Find the actual field name in an entity, case-insensitive.
 * Returns the correctly-cased field name, or falls back to the provided default.
 */
function findActualFieldName(entity: NormalizedEntity | undefined, fieldName: string): string {
  if (!entity) return fieldName;
  const match = entity.fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
  return match ? match.name : fieldName;
}

export async function parseDDLSchema(
  sqlText: string,
  dialect: 'postgresql' | 'mysql' = 'postgresql',
): Promise<NormalizedSchema> {
  const entities: NormalizedEntity[] = [];
  const relations: NormalizedSchema['relations'] = [];
  const enums: NormalizedSchema['enums'] = [];

  // First pass: extract table names
  const tableNameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(/gi;
  const tableNames: string[] = [];
  let nameMatch: RegExpExecArray | null;
  while ((nameMatch = tableNameRegex.exec(sqlText)) !== null) {
    tableNames.push(nameMatch[1]);
  }

  // Second pass: extract CREATE TABLE content
  const tableBlocks = sqlText.split(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i);
  
  for (let i = 1; i < tableBlocks.length; i++) {
    const block = tableBlocks[i];
    const tableNameMatch = block.match(/^["']?(\w+)["']?\s*\(([\s\S]*)$/i);
    if (!tableNameMatch) continue;
    
    const tableName = tableNameMatch[1];
    
    // Find matching closing paren
    let depth = 0;
    let bodyEnd = -1;
    const startFrom = tableNameMatch[2];
    for (let j = 0; j < startFrom.length; j++) {
      if (startFrom[j] === '(') depth++;
      if (startFrom[j] === ')') {
        depth--;
        if (depth < 0) {
          bodyEnd = j;
          break;
        }
      }
    }
    
    const body = bodyEnd > 0 ? startFrom.substring(0, bodyEnd) : startFrom;
    
    const fields: NormalizedField[] = [];
    let primaryKey = 'id';
    const indexes: NormalizedEntity['indexes'] = [];

    const lines = body.split('\n').map(l => l.trim().replace(/,$/, '')).filter(l => l && !l.startsWith('--'));
    
    for (const line of lines) {
      // Skip constraint-only lines
      if (line.match(/^(PRIMARY\s+KEY|UNIQUE\s*\(|FOREIGN|CONSTRAINT|INDEX|KEY\s*\(|CHECK)/i)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          primaryKey = pkMatch[1].trim().split(',')[0].trim().replace(/["']/g, '');
        }

        const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["']?(\w+)["']?\s*\(([^)]+)\)/i);
        if (fkMatch) {
          const refTable = findMatchingEntity(fkMatch[2], tableNames) || fkMatch[2];
          relations.push({
            type: 'one-to-many',
            from: { entity: tableName, field: fkMatch[1].trim().replace(/["']/g, '') },
            to: { entity: refTable, field: fkMatch[3].trim().replace(/["']/g, '') },
            isRequired: true,
            cascadeDelete: line.includes('ON DELETE CASCADE'),
          });
        }
        continue;
      }

      // Parse column definition
      const colMatch = line.match(/^["']?(\w+)["']?\s+([\w\s()]+?)(?:\s+(.*))?$/);
      if (!colMatch) continue;

      const colName = colMatch[1];
      let colType = colMatch[2].trim().toLowerCase();
      const constraints = (colMatch[3] ?? '').toUpperCase();

      // Extract max length
      let maxLength: number | undefined;
      const lenMatch = colType.match(/\((\d+)\)/);
      if (lenMatch) {
        maxLength = parseInt(lenMatch[1], 10);
        colType = colType.replace(/\(\d+\)/, '');
      }

      // Check for inline REFERENCES
      const inlineRefMatch = constraints.match(/REFERENCES\s+["']?(\w+)["']?\s*\(([^)]+)\)/i);
      const hasInlineRef = !!inlineRefMatch;
      const isFKByNaming = /\w_id$|\wId$/.test(colName) && colName !== 'id';
      const isUUIDLike = (colType === 'varchar' || colType === 'char') && maxLength === 36;

      // Determine FK info
      let referencedEntity: string | undefined;
      let referencedField: string | undefined;
      let isForeignKey = false;

      if (hasInlineRef && inlineRefMatch) {
        referencedEntity = findMatchingEntity(inlineRefMatch[1], tableNames) || inlineRefMatch[1];
        referencedField = inlineRefMatch[2].trim().replace(/["']/g, '');
        isForeignKey = true;
        
        const alreadyAdded = relations.some(r => r.from.entity === tableName && r.from.field === colName);
        if (!alreadyAdded) {
          relations.push({
            type: 'one-to-many',
            from: { entity: tableName, field: colName },
            to: { entity: referencedEntity, field: referencedField },
            isRequired: !constraints.includes('NULL') || constraints.includes('NOT NULL'),
            cascadeDelete: constraints.includes('ON DELETE CASCADE'),
          });
        }
      } else if (isFKByNaming) {
        const inferredName = colName.endsWith('_id') ? colName.slice(0, -3) : colName.slice(0, -2);
        referencedEntity = findMatchingEntity(inferredName, tableNames);
        referencedField = 'id';
        isForeignKey = !!referencedEntity;
      }

      // Determine field type
      let fieldType: FieldType;
      if (isUUIDLike) {
        fieldType = 'uuid';
      } else if (colType === 'enum') {
        fieldType = 'enum';
      } else {
        fieldType = SQL_TYPE_MAP[colType] ?? 'string';
      }

      const isRequired = !constraints.includes('NULL') || constraints.includes('NOT NULL') || hasInlineRef;
      const isUnique = constraints.includes('UNIQUE') || colName === 'id' || constraints.includes('PRIMARY KEY');
      const isAutoIncrement = constraints.includes('AUTO_INCREMENT') || constraints.includes('SERIAL') || colType.includes('serial');

      fields.push({
        name: colName,
        type: fieldType,
        isRequired,
        isUnique,
        isAutoIncrement,
        maxLength,
        isForeignKey,
        referencedEntity,
        referencedField,
        isNullable: !isRequired,
        enumValues: undefined,
        defaultValue: undefined,
      });
    }

    if (fields.length > 0) {
      entities.push({ name: tableName, tableName, fields, primaryKey, indexes });
    }
  }

  // Post-processing: normalize FK referencedField to match actual entity field names
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (field.isForeignKey && field.referencedEntity && field.referencedField) {
        const refEntity = entities.find(e => e.name === field.referencedEntity);
        if (refEntity) {
          field.referencedField = findActualFieldName(refEntity, field.referencedField);
        }
      }
    }
  }

  // Also normalize relation references
  for (const relation of relations) {
    const toEntity = entities.find(e => e.name === relation.to.entity);
    if (toEntity) {
      relation.to.field = findActualFieldName(toEntity, relation.to.field);
    }
  }

  // Extract ENUM types (PostgreSQL-style)
  const enumRegex = /CREATE\s+TYPE\s+["']?(\w+)["']?\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  let enumMatch: RegExpExecArray | null;
  while ((enumMatch = enumRegex.exec(sqlText)) !== null) {
    enums.push({
      name: enumMatch[1],
      values: enumMatch[2].split(',').map(v => v.trim().replace(/'/g, '')),
    });
  }

  return { entities, relations, enums, source: 'ddl' };
}
