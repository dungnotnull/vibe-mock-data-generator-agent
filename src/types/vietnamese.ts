/**
 * Vietnamese Data Types — Type definitions for Vietnamese data assets
 */

export interface VietnameseSurname {
  name: string;
  frequency_pct: number;
  note?: string;
}

export interface VietnameseGivenName {
  name: string;
  meaning?: string;
  frequency: number;
}

export interface VietnameseMiddleName {
  name: string;
  gender: 'male' | 'female' | 'neutral';
  frequency: number;
}

export interface VietnameseProvince {
  code: string;
  name: string;
  weight: number;
  note?: string;
  region?: string;
}

export interface VietnameseDistrict {
  code: string;
  provinceCode: string;
  name: string;
  type: string;
}

export interface VietnameseWard {
  code: string;
  districtCode: string;
  name: string;
  type: string;
  postalCode?: string;
}

export interface VietnameseStreet {
  name: string;
  city?: string;
  district?: string;
}
