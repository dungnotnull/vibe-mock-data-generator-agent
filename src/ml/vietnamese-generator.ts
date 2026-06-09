/**
 * Vietnamese Generator - Vietnamese-specific data generation
 * Uses custom JSON data assets for authentic Vietnamese data
 *
 * IMPORTANT: Uses faker (not Math.random) for deterministic --seed mode.
 * Sync generators use faker for all random selections.
 * Async generators load data from JSON files and also use faker.
 */

import { faker } from '@faker-js/faker/locale/vi';

// ─── Type definitions for Vietnamese data ────────────────────────

interface VietnameseSurname {
  name: string;
  frequency_pct: number;
  note?: string;
}

interface VietnameseGivenName {
  name: string;
  meaning?: string;
  frequency: number;
}

interface VietnameseMiddleName {
  name: string;
  gender: 'male' | 'female' | 'neutral';
  frequency: number;
}

interface VietnameseProvince {
  code: string;
  name: string;
  weight: number;
  region?: string;
  note?: string;
}

interface VietnameseDistrict {
  code: string;
  provinceCode: string;
  name: string;
  type: string;
}

interface VietnameseWard {
  code: string;
  districtCode: string;
  name: string;
  type: string;
  postalCode?: string;
}

interface VietnameseStreet {
  name: string;
  city?: string;
  district?: string;
}

// ─── Data Loading ─────────────────────────────────────────────────

let surnamesData: VietnameseSurname[] | null = null;
let femaleNamesData: VietnameseGivenName[] | null = null;
let maleNamesData: VietnameseGivenName[] | null = null;
let middleNamesData: VietnameseMiddleName[] | null = null;
let provincesData: VietnameseProvince[] | null = null;
let districtsData: VietnameseDistrict[] | null = null;
let wardsData: VietnameseWard[] | null = null;
let streetsData: VietnameseStreet[] | null = null;

async function loadData() {
  if (surnamesData) return;

  const { readFile } = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataDir = path.join(__dirname, '..', 'data', 'vietnamese');

  try {
    surnamesData = JSON.parse(await readFile(path.join(dataDir, 'surnames.json'), 'utf-8'));
    femaleNamesData = JSON.parse(await readFile(path.join(dataDir, 'given-names-female.json'), 'utf-8'));
    maleNamesData = JSON.parse(await readFile(path.join(dataDir, 'given-names-male.json'), 'utf-8'));
    middleNamesData = JSON.parse(await readFile(path.join(dataDir, 'middle-names.json'), 'utf-8'));
    provincesData = JSON.parse(await readFile(path.join(dataDir, 'provinces.json'), 'utf-8'));
    districtsData = JSON.parse(await readFile(path.join(dataDir, 'districts.json'), 'utf-8'));
    wardsData = JSON.parse(await readFile(path.join(dataDir, 'wards.json'), 'utf-8'));
    streetsData = JSON.parse(await readFile(path.join(dataDir, 'streets.json'), 'utf-8'));
  } catch (err) {
    console.error('Failed to load Vietnamese data files:', err);
    throw new Error('Vietnamese data assets not found. Ensure data/vietnamese/*.json files exist.');
  }
}

// ─── Weighted Random Helpers (using faker for determinism) ───────

function weightedRandomByPct<T extends { frequency_pct: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.frequency_pct, 0);
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });
  for (const item of items) {
    r -= item.frequency_pct;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function weightedRandomByFreq<T extends { frequency: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.frequency, 0);
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });
  for (const item of items) {
    r -= item.frequency;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function weightedRandomByWeight<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function weightedRandomStatic(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = faker.number.float({ min: 0, max: total, fractionDigits: 6 });
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// ─── Vietnamese Name Generation ────────────────────────────────────

export async function generateVietnameseName(gender?: 'male' | 'female'): Promise<string> {
  await loadData();
  const g = gender ?? faker.helpers.arrayElement(['male', 'female'] as const);

  const surname = weightedRandomByPct(surnamesData!);
  const givenNames = g === 'female' ? femaleNamesData! : maleNamesData!;
  const givenName = weightedRandomByFreq(givenNames);

  const genderMiddleNames = middleNamesData!.filter(m =>
    m.gender === g || m.gender === 'neutral'
  );
  const middleName = weightedRandomByFreq(genderMiddleNames);

  return surname.name + ' ' + middleName.name + ' ' + givenName.name;
}

export async function generateVietnameseSurname(): Promise<string> {
  await loadData();
  return weightedRandomByPct(surnamesData!).name;
}

export async function generateVietnameseGivenName(gender?: 'male' | 'female'): Promise<string> {
  await loadData();
  const g = gender ?? faker.helpers.arrayElement(['male', 'female'] as const);
  const names = g === 'female' ? femaleNamesData! : maleNamesData!;
  return weightedRandomByFreq(names).name;
}

// ─── Vietnamese Phone Generation ────────────────────────────────────

const CARRIER_PREFIXES: Record<string, string[]> = {
  viettel:  ['032', '033', '034', '035', '036', '037', '038', '039', '086', '096', '097', '098'],
  mobifone: ['070', '076', '077', '078', '079', '089', '090', '093'],
  vinaphone: ['081', '082', '083', '084', '085', '088', '091', '094'],
  vietnamobile: ['052', '056', '058', '092'],
  gmobile: ['059', '099'],
};

const CARRIER_WEIGHTS: Record<string, number> = {
  viettel: 0.50,
  mobifone: 0.20,
  vinaphone: 0.20,
  vietnamobile: 0.07,
  gmobile: 0.03,
};

export function generateVietnamesePhone(): string {
  const carrier = weightedRandomStatic(CARRIER_WEIGHTS);
  const prefixes = CARRIER_PREFIXES[carrier];
  const prefix = faker.helpers.arrayElement(prefixes);
  const subscriber = String(faker.number.int({ min: 0, max: 9999999 })).padStart(7, '0');
  return prefix + subscriber;
}

export function generateVietnamesePhoneFormatted(): string {
  const phone = generateVietnamesePhone();
  return phone.slice(0, 3) + ' ' + phone.slice(3, 6) + ' ' + phone.slice(6);
}

// ─── Vietnamese Address Generation ─────────────────────────────────

export async function generateVietnameseAddress(): Promise<string> {
  await loadData();

  const province = weightedRandomByWeight(provincesData!);
  const provinceDistricts = districtsData!.filter(d => d.provinceCode === province.code);

  let district: VietnameseDistrict;
  if (provinceDistricts.length > 0) {
    district = faker.helpers.arrayElement(provinceDistricts);
  } else {
    district = faker.helpers.arrayElement(districtsData!);
  }

  const districtWards = wardsData!.filter(w => w.districtCode === district.code);
  let ward: VietnameseWard;
  if (districtWards.length > 0) {
    ward = faker.helpers.arrayElement(districtWards);
  } else {
    ward = faker.helpers.arrayElement(wardsData!);
  }

  const street = streetsData!.length > 0
    ? faker.helpers.arrayElement(streetsData!)
    : { name: 'Nguy\u1EC5n Hu\u1EC7' };

  const houseNumber = faker.number.int({ min: 1, max: 999 });

  return houseNumber + ' ' + street.name + ', ' + ward.name + ', ' + district.name + ', ' + province.name;
}

export async function generateVietnameseCity(): Promise<string> {
  await loadData();
  const province = weightedRandomByWeight(provincesData!);
  return province.name;
}

// ─── Vietnamese CCCD (National ID) Generation ─────────────────────

export function generateVietnameseCCCD(gender?: 'male' | 'female', birthYear?: number): string {
  const g = gender ?? faker.helpers.arrayElement(['male', 'female'] as const);
  const year = birthYear ?? faker.number.int({ min: 1990, max: 2019 });

  // Use fake province codes (900-999) to avoid real identity collision
  const provinceCode = String(faker.number.int({ min: 900, max: 999 })).padStart(3, '0');
  const genderCentury = g === 'male'
    ? (year >= 2000 ? '2' : '0')
    : (year >= 2000 ? '3' : '1');
  const yearDigits = String(year % 100).padStart(2, '0');
  const sequential = String(faker.number.int({ min: 0, max: 999999 })).padStart(6, '0');

  return provinceCode + genderCentury + yearDigits + sequential;
}

// ─── Vietnamese VND Price Generation ────────────────────────────────

export function generateVNDPrice(
  category: 'budget' | 'mid' | 'premium' = 'mid',
): number {
  const ranges: Record<string, { min: number; max: number }> = {
    budget:  { min: 10_000,    max: 500_000 },
    mid:     { min: 500_000,   max: 5_000_000 },
    premium: { min: 5_000_000, max: 50_000_000 },
  };
  const range = ranges[category];
  const rawPrice = faker.number.int(range);
  return Math.round(rawPrice / 1000) * 1000;
}
