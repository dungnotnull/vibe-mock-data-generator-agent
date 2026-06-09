/**
 * TypeORM Entity Parser
 * Parses TypeORM entity decorators into NormalizedSchema
 * 
 * Note: Full TypeORM parsing requires importing the entities and using 
 * TypeORM's metadata API at runtime. This parser handles the most common
 * patterns from TypeORM entity TypeScript files using regex-based extraction.
 */

import type { NormalizedSchema, NormalizedEntity, NormalizedField, FieldType, Relation } from '../../types/index.js';

const TYPEORM_TYPE_MAP: Record<string, FieldType> = {
  String: 'string',
  Number: 'int',
  Boolean: 'boolean',
  Date: 'datetime',
  Buffer: 'bytes',
  Object: 'json',
  BigInt: 'bigint',
};

/**
 * Parse TypeORM entity definitions from a TypeScript source file.
 * Uses regex-based extraction of decorator patterns.
 */
export async function parseTypeORMSchema(sourceText: string): Promise<NormalizedSchema> {
  const entities: NormalizedEntity[] = [];
  const relations: Relation[] = [];
  const enums: NormalizedSchema['enums'] = [];

  // Extract entity classes
  const entityRegex = /@Entity\s*\(\s*(?:['"]([\w.]+)['"]\s*)?\)\s*(?:@Index\s*\([^)]*\)\s*)*export\s+class\s+(\w+)/g;
  let entityMatch: RegExpExecArray | null;

  const entityClasses: Array<{ tableName: string; className: string; startIdx: number }> = [];
  
  while ((entityMatch = entityRegex.exec(sourceText)) !== null) {
    entityClasses.push({
      tableName: entityMatch[1] || entityMatch[2].toLowerCase() + 's',
      className: entityMatch[2],
      startIdx: entityMatch.index,
    });
  }

  for (let i = 0; i < entityClasses.length; i++) {
    const { tableName, className } = entityClasses[i];
    const startIdx = entityClasses[i].startIdx;
    const endIdx = i + 1 < entityClasses.length ? entityClasses[i + 1].startIdx : sourceText.length;
    const classBody = sourceText.substring(startIdx, endIdx);

    const fields: NormalizedField[] = [];
    let primaryKey = 'id';

    // Extract primary generated column
    const pgMatch = classBody.match(/@PrimaryGeneratedColumn\s*(?:\(\s*(?:{[^}]*})?\s*\))?\s*(?:@[\w.]+\s*(?:\([^)]*\)\s*)?)*\s*(\w+)\s*:\s*(\w+)/);
    if (pgMatch) {
      primaryKey = pgMatch[1];
      const pkType = pgMatch[2] === 'string' ? 'uuid' : 'int';
      fields.push({
        name: pgMatch[1],
        type: pkType,
        isRequired: true,
        isUnique: true,
        isAutoIncrement: true,
        isForeignKey: false,
        isNullable: false,
      });
    }

    // Extract columns with @Column decorator
    const columnRegex = /@Column\s*(?:\(\s*(?:{([^}]*)})?\s*\))?\s*(?:@[\w.]+\s*(?:\([^)]*\)\s*)?)*\s*(\w+)\s*:\s*(\w+)/g;
    let colMatch: RegExpExecArray | null;
    while ((colMatch = columnRegex.exec(classBody)) !== null) {
      const options = colMatch[1] || '';
      const colName = colMatch[2];
      const colType = colMatch[3];

      if (colName === primaryKey) continue;

      const isNullable = options.includes('nullable') && (options.includes('true') || options.includes(': true'));
      const isUnique = options.includes('unique') && (options.includes('true') || options.includes(': true'));

      let fieldType: FieldType = TYPEORM_TYPE_MAP[colType] ?? 'string';
      let maxLength: number | undefined;
      let enumValues: string[] | undefined;

      const typeMatch = options.match(/type:\s*['"](\w+)['"]/);
      if (typeMatch) {
        fieldType = TYPEORM_TYPE_MAP[typeMatch[1]] ?? 'string';
      }

      const lenMatch = options.match(/length:\s*(\d+)/);
      if (lenMatch) {
        maxLength = parseInt(lenMatch[1], 10);
      }

      const enumMatch = options.match(/enum:\s*\[([^\]]+)\]/);
      if (enumMatch) {
        enumValues = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
        fieldType = 'enum';
      }

      fields.push({
        name: colName,
        type: fieldType,
        isRequired: !isNullable,
        isUnique,
        isAutoIncrement: false,
        maxLength,
        enumValues,
        isForeignKey: false,
        isNullable,
      });
    }

    // Extract @ManyToOne / @JoinColumn relations
    const mtoRegex = /@(ManyToOne|OneToOne)\s*\([^)]*\)\s*(?:@JoinColumn\s*(?:\(\s*(?:{[^}]*})?\s*\))?\s*)?(\w+)\s*:\s*(\w+)/g;
    let mtoMatch: RegExpExecArray | null;
    while ((mtoMatch = mtoRegex.exec(classBody)) !== null) {
      const relType = mtoMatch[1] === 'OneToOne' ? 'one-to-one' : 'one-to-many';
      const fieldName = mtoMatch[2];
      const targetEntity = mtoMatch[3];
      
      fields.push({
        name: fieldName,
        type: 'uuid',
        isRequired: false,
        isUnique: relType === 'one-to-one',
        isAutoIncrement: false,
        isForeignKey: true,
        referencedEntity: targetEntity,
        referencedField: 'id',
        isNullable: true,
      });

      relations.push({
        type: relType,
        from: { entity: className, field: fieldName },
        to: { entity: targetEntity, field: 'id' },
        isRequired: false,
        cascadeDelete: false,
      });
    }

    if (fields.length > 0) {
      entities.push({ name: className, tableName, fields, primaryKey, indexes: [] });
    }
  }

  return { entities, relations, enums, source: 'typeorm' };
}
