/**
 * Prisma Schema Parser
 * Uses @prisma/internals DMMF to parse .prisma files into NormalizedSchema
 */

import type { NormalizedSchema, NormalizedEntity, NormalizedField, Relation, EnumDefinition, FieldType } from '../../types/index.js';

const PRISMA_TYPE_MAP: Record<string, FieldType> = {
  String: 'string',
  Int: 'int',
  Float: 'float',
  Boolean: 'boolean',
  DateTime: 'datetime',
  Json: 'json',
  Bytes: 'bytes',
  BigInt: 'bigint',
  Decimal: 'decimal',
};

export async function parsePrismaSchema(schemaPath: string): Promise<NormalizedSchema> {
  const { getDMMF } = await import('@prisma/internals');
  const { readFile } = await import('fs/promises');
  
  const schemaText = await readFile(schemaPath, 'utf-8');
  const dmmf = await getDMMF({ datamodel: schemaText });

  const entities: NormalizedEntity[] = [];
  const relations: Relation[] = [];
  const enums: EnumDefinition[] = [];

  // Parse enums
  for (const en of dmmf.datamodel.enums) {
    enums.push({
      name: en.name,
      values: en.values.map(v => v.name),
    });
  }

  // Parse models
  for (const model of dmmf.datamodel.models) {
    const fields: NormalizedField[] = [];
    let primaryKey = 'id';
    const indexes: NormalizedEntity['indexes'] = [];

    // Find primary key
    if (model.primaryKey?.fields && model.primaryKey.fields.length > 0) {
      primaryKey = model.primaryKey.fields[0];
    }

    for (const field of model.fields) {
      // Skip relation fields (object kind) - they are not DB columns
      if (field.kind === 'object') {
        if (field.relationName && field.relationFromFields && field.relationFromFields.length > 0) {
          const isOneToOne = field.isUnique || false;
          relations.push({
            type: isOneToOne ? 'one-to-one' : 'one-to-many',
            from: { entity: model.name, field: field.relationFromFields[0] },
            to: { entity: field.type, field: (field.relationToFields?.[0] ?? 'id') },
            isRequired: field.isRequired,
            cascadeDelete: field.relationOnDelete === 'Cascade',
          });
        }
        continue;
      }

      // Check if this field is a FK (scalar field that is part of a relation)
      const fkInfo = model.fields.find(f => 
        f.kind === 'object' && 
        f.relationFromFields?.includes(field.name)
      );

      // Map Prisma type
      const mappedType: FieldType = field.kind === 'enum' 
        ? 'enum'
        : (PRISMA_TYPE_MAP[field.type] ?? 'string');

      const defaultValue = field.hasDefaultValue ? field.default : undefined;

      const nf: NormalizedField = {
        name: field.name,
        type: mappedType,
        isRequired: field.isRequired,
        isUnique: field.isUnique,
        isAutoIncrement: !!(field.isId && typeof defaultValue === 'object' && defaultValue !== null && 'name' in defaultValue && (defaultValue as Record<string, unknown>).name === 'autoincrement'),
        defaultValue: defaultValue as unknown,
        maxLength: field.documentation 
          ? (parseInt(field.documentation, 10) || undefined)
          : undefined,
        enumValues: field.kind === 'enum' ? [field.type] : undefined,
        isForeignKey: !!fkInfo,
        referencedEntity: fkInfo ? fkInfo.type : undefined,
        referencedField: fkInfo ? (fkInfo.relationToFields?.[0] ?? 'id') : undefined,
        isNullable: !field.isRequired,
      };

      if (field.isId) {
        primaryKey = field.name;
      }

      fields.push(nf);
    }

    // Parse unique constraints from uniqueFields
    if (model.uniqueFields && model.uniqueFields.length > 0) {
      for (const uniqFields of model.uniqueFields) {
        indexes.push({
          name: model.name + '_' + uniqFields.join('_') + '_key',
          fields: [...uniqFields],
          isUnique: true,
        });
      }
    }

    entities.push({
      name: model.name,
      tableName: model.dbName ?? (model.name.charAt(0).toLowerCase() + model.name.slice(1) + 's'),
      fields,
      primaryKey,
      indexes,
    });
  }

  return {
    entities,
    relations,
    enums,
    source: 'prisma',
  };
}
