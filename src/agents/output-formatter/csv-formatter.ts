/**
 * CSV Formatter — RFC 4180 compliant CSV output
 */

import type { GeneratedRecord } from '../../types/index.js';

export function formatCSV(
  entityName: string,
  records: GeneratedRecord[],
): string {
  if (records.length === 0) return '';

  const fields = Object.keys(records[0]).filter(k => k !== '__edgeCase');
  const header = fields.map(f => csvEscapeHeader(f)).join(',');
  const rows = records.map(record => {
    return fields.map(f => {
      const value = (record as Record<string, unknown>)[f];
      return csvEscape(value);
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

function csvEscapeHeader(name: string): string {
  // Convert camelCase to snake_case for CSV headers
  const snake = name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
  if (snake.includes(',') || snake.includes('"') || snake.includes('\n')) {
    return '"' + snake.replace(/"/g, '""') + '"';
  }
  return snake;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    // JSON objects/arrays — stringify and escape
    const str = JSON.stringify(value).replace(/"/g, '""');
    return '"' + str + '"';
  }
  const str = String(value);
  // RFC 4180: if contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function formatAllCSV(
  data: Map<string, GeneratedRecord[]>,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [entity, records] of data) {
    result.set(entity, formatCSV(entity, records));
  }
  return result;
}
