/**
 * JSON Fixture Formatter
 * Generates structured JSON for use with Jest/Vitest fixtures
 */

import type { GeneratedRecord } from '../../types/index.js';

export function formatJSONFixtures(
  data: Map<string, GeneratedRecord[]>,
): string {
  const result: Record<string, GeneratedRecord[]> = {};

  for (const [entity, records] of data) {
    // Clean edge case metadata
    result[entity] = records.map(r => {
      const { __edgeCase, ...rest } = r as Record<string, unknown>;
      return rest as GeneratedRecord;
    });
  }

  // Handle Date objects in JSON serialization
  return JSON.stringify({
    _metadata: {
      generatedAt: new Date().toISOString(),
      totalRecords: Array.from(data.values()).reduce((s, r) => s + r.length, 0),
      generator: 'vibe-mock-data-generator-agent',
      version: '1.0.0',
    },
    ...result,
  }, (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  }, 2);
}
