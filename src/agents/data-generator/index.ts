/**
 * Data Generator — Orchestrates the core generation engine
 * Combines Faker, Ollama, Distribution, and Edge Case generators
 */

export { generateFakerValue, resetUniqueTracker, pickFkValue, generateUniqueValue } from './faker-generator.js';
export { weightedRandom, assignActivityLevel, orderCountByLevel, generateRealisticTimestamp, generateOrderStatus, logNormalPrice, vndPriceRange, exponentialQuantity } from './distribution-engine.js';
export { injectEdgeCases } from './edge-case-generator.js';
export { validateIntegrity } from './integrity-validator.js';
export type { ValidationResult, ValidationError, ValidationWarning } from './integrity-validator.js';
