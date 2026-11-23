/**
 * CPCB (Central Pollution Control Board, India) National Air Quality Index.
 *
 * Implements the official breakpoint linear-interpolation method:
 *   I = I_lo + (I_hi − I_lo) × (C − C_lo) / (C_hi − C_lo)
 * The overall AQI is the maximum sub-index across pollutants, with the
 * responsible pollutant reported as "dominant".
 *
 * Reference: CPCB National Air Quality Index guidelines (2014, rev. 2019).
 * @module @vayusense/shared/aqi
 */
import type { AqiCategory, AqiResult, Pollutant } from './types';

interface Breakpoint {
  cLo: number;
  cHi: number;
  iLo: number;
  iHi: number;
}

/**
 * 24-hour average breakpoints (O₃/CO use 8-hour averages per CPCB).
 * The final band extrapolates beyond the last measured breakpoint and is
 * capped at 500, matching the "Severe+" emergency convention.
 */
const BREAKPOINTS: Record<Pollutant, Breakpoint[]> = {
  pm25: [
    { cLo: 0, cHi: 30, iLo: 0, iHi: 50 },
    { cLo: 31, cHi: 60, iLo: 51, iHi: 100 },
    { cLo: 61, cHi: 90, iLo: 101, iHi: 200 },
    { cLo: 91, cHi: 120, iLo: 201, iHi: 300 },
    { cLo: 121, cHi: 250, iLo: 301, iHi: 400 },
    { cLo: 250, cHi: 500, iLo: 401, iHi: 500 },
  ],
  pm10: [
    { cLo: 0, cHi: 50, iLo: 0, iHi: 50 },
    { cLo: 51, cHi: 100, iLo: 51, iHi: 100 },
    { cLo: 101, cHi: 250, iLo: 101, iHi: 200 },
    { cLo: 251, cHi: 350, iLo: 201, iHi: 300 },
    { cLo: 351, cHi: 430, iLo: 301, iHi: 400 },
    { cLo: 430, cHi: 600, iLo: 401, iHi: 500 },
  ],
  no2: [
    { cLo: 0, cHi: 40, iLo: 0, iHi: 50 },
    { cLo: 41, cHi: 80, iLo: 51, iHi: 100 },
    { cLo: 81, cHi: 180, iLo: 101, iHi: 200 },
    { cLo: 181, cHi: 280, iLo: 201, iHi: 300 },
    { cLo: 281, cHi: 400, iLo: 301, iHi: 400 },
    { cLo: 400, cHi: 600, iLo: 401, iHi: 500 },
  ],
  o3: [
    { cLo: 0, cHi: 50, iLo: 0, iHi: 50 },
    { cLo: 51, cHi: 100, iLo: 51, iHi: 100 },
    { cLo: 101, cHi: 168, iLo: 101, iHi: 200 },
    { cLo: 169, cHi: 208, iLo: 201, iHi: 300 },
    { cLo: 209, cHi: 748, iLo: 301, iHi: 400 },
    { cLo: 748, cHi: 1000, iLo: 401, iHi: 500 },
  ],
  so2: [
    { cLo: 0, cHi: 40, iLo: 0, iHi: 50 },
    { cLo: 41, cHi: 80, iLo: 51, iHi: 100 },
    { cLo: 81, cHi: 380, iLo: 101, iHi: 200 },
    { cLo: 381, cHi: 800, iLo: 201, iHi: 300 },
    { cLo: 801, cHi: 1600, iLo: 301, iHi: 400 },
    { cLo: 1600, cHi: 2400, iLo: 401, iHi: 500 },
  ],
  co: [
    { cLo: 0, cHi: 1, iLo: 0, iHi: 50 },
    { cLo: 1.1, cHi: 2, iLo: 51, iHi: 100 },
    { cLo: 2.1, cHi: 10, iLo: 101, iHi: 200 },
    { cLo: 10.1, cHi: 17, iLo: 201, iHi: 300 },
    { cLo: 17.1, cHi: 34, iLo: 301, iHi: 400 },
    { cLo: 34, cHi: 50, iLo: 401, iHi: 500 },
  ],
  nh3: [
    { cLo: 0, cHi: 200, iLo: 0, iHi: 50 },
    { cLo: 201, cHi: 400, iLo: 51, iHi: 100 },
    { cLo: 401, cHi: 800, iLo: 101, iHi: 200 },
    { cLo: 801, cHi: 1200, iLo: 201, iHi: 300 },
    { cLo: 1201, cHi: 1800, iLo: 301, iHi: 400 },
    { cLo: 1800, cHi: 2400, iLo: 401, iHi: 500 },
  ],
};

/**
 * Compute the CPCB sub-index for a single pollutant concentration.
 * Returns `null` for missing/negative readings so callers can skip them.
 *
 * CPCB convention: concentrations are truncated before interpolation —
 * integers for µg/m³ pollutants, one decimal for CO (mg/m³). Truncation plus
 * clamping to the band floor removes artifacts from the integer breakpoint
 * gaps (e.g. 60.5 µg/m³ must map to the 31–60 band, not slip below its floor).
 */
export function computeSubIndex(pollutant: Pollutant, concentration: number): number | null {
  if (!Number.isFinite(concentration) || concentration < 0) return null;
  const truncated =
    pollutant === 'co' ? Math.floor(concentration * 10) / 10 : Math.floor(concentration);
  const bands = BREAKPOINTS[pollutant];
  const band = bands.find((b) => truncated <= b.cHi) ?? bands[bands.length - 1];
  const clamped = Math.min(Math.max(truncated, band.cLo), band.cHi);
  const value = band.iLo + ((band.iHi - band.iLo) * (clamped - band.cLo)) / (band.cHi - band.cLo);
  return Math.round(Math.min(Math.max(value, 0), 500));
}

/**
 * Aggregate pollutant readings into the overall AQI (max sub-index).
 * @throws {Error} when no valid reading is supplied.
 */
export function computeAqi(readings: Partial<Record<Pollutant, number>>): AqiResult {
  const subIndices: Partial<Record<Pollutant, number>> = {};
  let dominant: Pollutant | null = null;
  let aqi = -1;

  for (const [key, concentration] of Object.entries(readings)) {
    const pollutant = key as Pollutant;
    const sub = computeSubIndex(pollutant, concentration as number);
    if (sub === null) continue;
    subIndices[pollutant] = sub;
    if (sub > aqi) {
      aqi = sub;
      dominant = pollutant;
    }
  }

  if (dominant === null || aqi < 0) {
    throw new Error('At least one valid pollutant reading is required to compute AQI.');
  }
  return { aqi, dominant, subIndices };
}

/** Map an AQI value to its CPCB category. */
export function categoryOf(aqi: number): AqiCategory {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'satisfactory';
  if (aqi <= 200) return 'moderate';
  if (aqi <= 300) return 'poor';
  if (aqi <= 400) return 'very_poor';
  return 'severe';
}

export interface CategoryMeta {
  label: string;
  range: [number, number];
  color: string;
  advice: string;
  maskRecommended: boolean;
  ventilation: 'safe' | 'limited' | 'avoid';
  outdoorActivity: 'normal' | 'reduced' | 'avoid';
}

/** Display + health-guidance metadata for every CPCB category. */
export const CATEGORY_META: Record<AqiCategory, CategoryMeta> = {
  good: {
    label: 'Good',
    range: [0, 50],
    color: '#22c55e',
    advice: 'Air is clean. Open windows, enjoy outdoor play and ventilate freely.',
    maskRecommended: false,
    ventilation: 'safe',
    outdoorActivity: 'normal',
  },
  satisfactory: {
    label: 'Satisfactory',
    range: [51, 100],
    color: '#84cc16',
    advice: 'Minor breathing discomfort for sensitive people. Most activities are fine.',
    maskRecommended: false,
    ventilation: 'safe',
    outdoorActivity: 'normal',
  },
  moderate: {
    label: 'Moderate',
    range: [101, 200],
    color: '#eab308',
    advice:
      'Breathing discomfort for people with lung/heart conditions. Limit prolonged outdoor exertion for kids and elders.',
    maskRecommended: false,
    ventilation: 'limited',
    outdoorActivity: 'reduced',
  },
  poor: {
    label: 'Poor',
    range: [201, 300],
    color: '#f97316',
    advice:
      'Breathing discomfort for most people on prolonged exposure. Prefer indoor activities; use N95 outdoors.',
    maskRecommended: true,
    ventilation: 'limited',
    outdoorActivity: 'reduced',
  },
  very_poor: {
    label: 'Very Poor',
    range: [301, 400],
    color: '#ef4444',
    advice:
      'Respiratory illness on prolonged exposure. Keep kids and elders indoors, run purification, N95 mandatory outside.',
    maskRecommended: true,
    ventilation: 'avoid',
    outdoorActivity: 'avoid',
  },
  severe: {
    label: 'Severe',
    range: [401, 500],
    color: '#991b1b',
    advice:
      'Health emergency: serious risk for everyone. Avoid all outdoor exposure, seal windows, run purifiers, follow official advisories.',
    maskRecommended: true,
    ventilation: 'avoid',
    outdoorActivity: 'avoid',
  },
};
