/**
 * VayuSense domain types shared by the web app, Cloud Functions and tests.
 * @module @vayusense/shared/types
 */

/** Household personas the Gemini assistant personalizes advice for. */
export type Persona =
  'family_kids' | 'elderly' | 'asthma' | 'commuter' | 'outdoor_worker' | 'school_admin';

/** CPCB (India) AQI categories. */
export type AqiCategory = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very_poor' | 'severe';

/** Pollutants tracked by the Google Air Quality API and CPCB stations. */
export const POLLUTANTS = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3'] as const;
export type Pollutant = (typeof POLLUTANTS)[number];

/** One pollutant concentration reading (µg/m³, CO in mg/m³). */
export interface PollutantReading {
  pollutant: Pollutant;
  concentration: number;
  unit: 'µg/m³' | 'mg/m³';
}

/** Result of the CPCB sub-index aggregation. */
export interface AqiResult {
  aqi: number;
  dominant: Pollutant;
  subIndices: Partial<Record<Pollutant, number>>;
}

/** A point-in-time air quality observation for a location. */
export interface AirQualitySnapshot {
  location: { lat: number; lng: number; label: string };
  aqi: number;
  category: AqiCategory;
  dominant: Pollutant;
  pollutants: PollutantReading[];
  observedAt: string;
  source: 'google_air_quality' | 'demo';
}

/** Hourly forecast entry used by the dashboard chart. */
export interface ForecastPoint {
  hour: string;
  aqi: number;
  pm25: number;
}

/** One step of a Gemini-generated low-emission daily routine. */
export interface RoutineStep {
  time: string;
  activity: string;
  location: 'indoor' | 'outdoor' | 'transit';
  emissionSaving: string;
  healthNote: string;
}

/** A personalized daily routine produced by Gemini structured output. */
export interface DailyRoutine {
  title: string;
  summary: string;
  steps: RoutineStep[];
  estimatedCo2eSavedKg: number;
}

/** A sustainable swap with quantified baseline vs alternative emissions. */
export interface SwapDefinition {
  id: string;
  title: string;
  from: string;
  to: string;
  unit: 'km' | 'kWh' | 'kg' | 'meal' | 'minute';
  /** kg CO₂e per unit of activity. */
  baseline: { co2eKg: number; pm25G: number };
  alternative: { co2eKg: number; pm25G: number };
  description: string;
  icon: string;
  effort: 'easy' | 'moderate' | 'ambitious';
}

/** Quantified impact of adopting a swap. */
export interface SwapImpact {
  swapId: string;
  weeklyCo2eKg: number;
  weeklyPm25G: number;
  monthlyCo2eKg: number;
  yearlyCo2eKg: number;
  treesEquivalent: number;
  carKmEquivalent: number;
}

/** A civic pollution report submitted by the community. */
export interface CommunityReport {
  id: string;
  location: { lat: number; lng: number; label: string };
  category: 'traffic' | 'burning' | 'construction' | 'industry' | 'other';
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  sentimentScore: number;
  authorName: string;
  createdAt: string;
}

/** Assistant chat turn (Gemini role naming). */
export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}
