/**
 * Distribution Engine — Statistical distributions for realistic data
 * Implements Pareto, Gaussian, Poisson, weighted enum, and temporal distributions
 *
 * IMPORTANT: Uses faker (not Math.random) for deterministic --seed mode.
 */

import { faker } from '@faker-js/faker/locale/vi';
import type { ActivityLevel } from '../../types/index.js';

// ─── Weighted Random Selection ─────────────────────────────────

export function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  // Use faker for deterministic random
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });

  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }

  return entries[entries.length - 1][0];
}

// ─── Pareto Distribution (80/20 Rule) ─────────────────────────

export function assignActivityLevel(
  userIndex: number,
  totalUsers: number,
): ActivityLevel {
  const percentile = userIndex / totalUsers;

  if (percentile < 0.02) return 'whale';
  if (percentile < 0.20) return 'heavy';
  if (percentile < 0.50) return 'moderate';
  if (percentile < 0.80) return 'light';
  return 'dormant';
}

export const orderCountByLevel: Record<ActivityLevel, () => number> = {
  whale:    () => faker.number.int({ min: 50, max: 200 }),
  heavy:    () => faker.number.int({ min: 10, max: 50 }),
  moderate: () => faker.number.int({ min: 3, max: 9 }),
  light:    () => faker.number.int({ min: 1, max: 2 }),
  dormant:  () => 0,
};

// ─── Temporal Distribution ────────────────────────────────────

const VN_ECOMMERCE_HOUR_WEIGHTS = [
  0.2, 0.1, 0.1, 0.1, 0.1, 0.2,  // 0-5
  0.5, 1.0, 1.5, 2.0, 2.5, 3.0,  // 6-11
  4.0, 3.0, 2.5, 2.5, 3.0, 4.0,  // 12-17
  5.0, 6.0, 7.0, 6.0, 4.0, 2.0,  // 18-23
];

export function weightedHour(weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function generateRealisticTimestamp(
  distribution: 'business-hours' | 'uniform' | 'evening-peak',
  from: Date,
  to: Date,
): Date {
  const baseDate = faker.date.between({ from, to });

  switch (distribution) {
    case 'business-hours': {
      const isWeekday = baseDate.getDay() > 0 && baseDate.getDay() < 6;
      const hour = isWeekday
        ? weightedHour(VN_ECOMMERCE_HOUR_WEIGHTS)
        : weightedHour([
            0, 0, 0, 0, 0, 0, 1, 2,
            5, 10, 15, 18, 20, 18, 15, 12,
            10, 15, 18, 15, 12, 8, 5, 2,
          ]);
      baseDate.setHours(hour, faker.number.int(59), faker.number.int(59));
      return baseDate;
    }

    case 'evening-peak': {
      const hour = weightedHour([
        0, 0, 0, 0, 0, 0, 1, 1, 2, 4, 6, 8, 10, 8, 7, 8, 10, 14, 20, 22, 18, 12, 8, 4,
      ]);
      baseDate.setHours(hour, faker.number.int(59), faker.number.int(59));
      return baseDate;
    }

    case 'uniform':
    default:
      return baseDate;
  }
}

// ─── Order Status State Machine ───────────────────────────────

export function generateOrderStatus(createdAt: Date): string {
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < 0.1) {
    return weightedRandom({ PENDING: 0.70, PROCESSING: 0.25, CANCELLED: 0.05 } as Record<string, number>);
  } else if (ageInDays < 3) {
    return weightedRandom({ PROCESSING: 0.40, SHIPPED: 0.35, COMPLETED: 0.15, CANCELLED: 0.10 } as Record<string, number>);
  } else if (ageInDays < 30) {
    return weightedRandom({ COMPLETED: 0.70, SHIPPED: 0.10, CANCELLED: 0.12, REFUNDED: 0.08 } as Record<string, number>);
  } else {
    return weightedRandom({ COMPLETED: 0.82, CANCELLED: 0.10, REFUNDED: 0.08 } as Record<string, number>);
  }
}

// ─── Price Distribution (Log-Normal) ──────────────────────────

export function logNormalPrice(meanLog: number, stdLog: number): number {
  // Use faker for deterministic Box-Muller transform
  const u1 = faker.number.float({ min: 0.0001, max: 1, fractionDigits: 10 });
  const u2 = faker.number.float({ min: 0.0001, max: 1, fractionDigits: 10 });
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const rawPrice = Math.exp(meanLog + stdLog * z);
  // Round to nearest 1000 VND
  return Math.round(rawPrice / 1000) * 1000;
}

export function vndPriceRange(
  category: 'budget' | 'mid' | 'premium',
  domain: string = 'ecommerce',
): { min: number; max: number } {
  const priceRanges: Record<string, Record<string, { min: number; max: number }>> = {
    ecommerce: {
      budget:  { min: 10_000,    max: 500_000 },
      mid:     { min: 500_000,   max: 5_000_000 },
      premium: { min: 5_000_000, max: 50_000_000 },
    },
    restaurant: {
      budget:  { min: 20_000,    max: 100_000 },
      mid:     { min: 100_000,   max: 500_000 },
      premium: { min: 500_000,   max: 5_000_000 },
    },
  };

  const ranges = priceRanges[domain] ?? priceRanges.ecommerce;
  return ranges[category];
}

// ─── Exponential Distribution (for quantities) ─────────────────

export function exponentialQuantity(mean: number = 2): number {
  return Math.max(1, Math.round(-mean * Math.log(faker.number.float({ min: 0.0001, max: 1, fractionDigits: 10 }))));
}
