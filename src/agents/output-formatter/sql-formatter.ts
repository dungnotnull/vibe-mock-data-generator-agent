/**
 * SQL INSERT Formatter
 * Generates SQL INSERT statements for any database
 */

import type { GeneratedRecord } from '../../types/index.js';

export function formatSQLInserts(
  data: Map<string, GeneratedRecord[]>,
  seedOrder: string[],
): string {
  const lines: string[] = [];
  lines.push('-- @generated-mock-data -- DO NOT USE IN PRODUCTION');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push('-- Records: ' + Array.from(data.values()).reduce((s, r) => s + r.length, 0) + ' total');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Delete in reverse dependency order
  for (const entity of seedOrder.slice().reverse()) {
    lines.push('DELETE FROM ' + toSnakeCase(entity) + ';');
  }
  lines.push('');

  for (const entity of seedOrder) {
    const records = data.get(entity) ?? [];
    if (records.length === 0) continue;

    const tableName = toSnakeCase(entity);
    const fields = Object.keys(records[0]).filter(k => k !== '__edgeCase');

    lines.push('-- ' + entity + ': ' + records.length + ' records');

    for (const record of records) {
      const values = fields.map(f => formatSQLValue((record as Record<string, unknown>)[f]));
      lines.push('INSERT INTO ' + tableName + ' (' + fields.map(f => toSnakeCase(f)).join(', ') + ') VALUES (' + values.join(', ') + ');');
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

function formatSQLValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Date) return "'" + value.toISOString() + "'";
  if (typeof value === 'string') return "'" + value.replace(/'/g, "''") + "'";
  if (typeof value === 'object') return "'" + JSON.stringify(value).replace(/'/g, "''") + "'";
  return String(value);
}

function toSnakeCase(str: string): string {
  // Properly handles camelCase -> snake_case, PascalCase -> snake_case
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
