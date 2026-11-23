/**
 * Google Air Quality API client (Maps Platform).
 *
 * Fetches current conditions + hourly forecast from
 * airquality.googleapis.com, converts pollutant units to CPCB conventions,
 * and computes the official Indian AQI via the shared domain layer —
 * Google's universal index is kept alongside for reference.
 * Results are cached in Firestore (15 min TTL) to protect quota and latency.
 */
import {
  categoryOf,
  computeAqi,
  type AirQualitySnapshot,
  type ForecastPoint,
  type Pollutant,
  type PollutantReading,
} from '@vayusense/shared';
import { z } from 'zod';
import { config } from '../config';
import { demoForecast, demoSnapshot } from '../demo/scenario';
import { upstreamError } from '../lib/errors';
import { logInfo, logWarn } from '../lib/logger';
import { cacheKey, readCachedSnapshot, writeCachedSnapshot } from './firestore';

const BASE_URL = 'https://airquality.googleapis.com/v1';

const concentrationSchema = z.object({
  value: z.number(),
  units: z.string().optional(),
});

const pollutantSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  concentration: concentrationSchema.optional(),
});

const indexSchema = z.object({
  code: z.string(),
  aqi: z.number().optional(),
  category: z.string().optional(),
});

const currentResponseSchema = z.object({
  indexes: z.array(indexSchema).optional(),
  pollutants: z.array(pollutantSchema).optional(),
});

const forecastResponseSchema = z.object({
  hourlyForecasts: z
    .array(
      z.object({
        dateTime: z.string().optional(),
        indexes: z.array(indexSchema).optional(),
        pollutants: z.array(pollutantSchema).optional(),
      }),
    )
    .optional(),
});

/** ppb → µg/m³ conversion factors at 25 °C, 1 atm (molecular weight / 24.45). */
const PPB_TO_UGM3: Record<string, number> = {
  no2: 1.88,
  o3: 1.96,
  so2: 2.62,
  co: 1.145,
  nh3: 0.696,
};

const KNOWN_POLLUTANTS = new Set<Pollutant>(['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3']);

/** Normalize a Google pollutant entry to CPCB units (µg/m³; CO in mg/m³). */
function toReading(entry: z.infer<typeof pollutantSchema>): PollutantReading | null {
  const code = entry.code.toLowerCase() as Pollutant;
  if (!KNOWN_POLLUTANTS.has(code) || !entry.concentration) return null;
  let value = entry.concentration.value;
  if (entry.concentration.units === 'PARTS_PER_BILLION') {
    value *= PPB_TO_UGM3[code] ?? 1;
  }
  if (code === 'co') value /= 1000; // µg/m³ → mg/m³
  return {
    pollutant: code,
    concentration: Math.round(value * 100) / 100,
    unit: code === 'co' ? 'mg/m³' : 'µg/m³',
  };
}

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${BASE_URL}/${path}?key=${config.mapsApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw upstreamError('google_air_quality', `HTTP ${response.status}`);
  }
  return schema.parse(await response.json());
}

/** Current conditions with CPCB AQI aggregation and Firestore caching. */
export async function fetchCurrent(
  lat: number,
  lng: number,
  label = 'Selected location',
): Promise<AirQualitySnapshot> {
  const key = cacheKey(lat, lng);
  const cached = await readCachedSnapshot(key);
  if (cached) {
    logInfo('airquality.cache_hit', { key });
    // Cache is label-neutral: apply this requester's label, never another's.
    return { ...cached, location: { ...cached.location, label } };
  }

  if (config.demo.airQuality) {
    logInfo('service.demo_fallback', { service: 'air_quality', endpoint: 'current' });
    return demoSnapshot(label);
  }

  const data = await post(
    'currentConditions:lookup',
    {
      location: { latitude: lat, longitude: lng },
      extraComputations: ['HEALTH_RECOMMENDATIONS', 'DOMINANT_POLLUTANT'],
      languageCode: 'en',
    },
    currentResponseSchema,
  );

  const readings = (data.pollutants ?? [])
    .map(toReading)
    .filter((r): r is PollutantReading => r !== null);
  if (readings.length === 0)
    throw upstreamError('google_air_quality', 'No pollutant data returned');

  const concentrations = Object.fromEntries(readings.map((r) => [r.pollutant, r.concentration]));
  const result = computeAqi(concentrations);
  const snapshot: AirQualitySnapshot = {
    location: { lat, lng, label },
    aqi: result.aqi,
    category: categoryOf(result.aqi),
    dominant: result.dominant,
    pollutants: readings,
    observedAt: new Date().toISOString(),
    source: 'google_air_quality',
  };

  // Store label-neutral so one user's place name never leaks into another's.
  await writeCachedSnapshot(key, {
    ...snapshot,
    location: { ...snapshot.location, label: '' },
  });
  logInfo('airquality.fetched', { key, aqi: snapshot.aqi });
  return snapshot;
}

/** 24-hour hourly forecast for the dashboard chart. */
export async function fetchForecast(lat: number, lng: number): Promise<ForecastPoint[]> {
  if (config.demo.airQuality) {
    logInfo('service.demo_fallback', { service: 'air_quality', endpoint: 'forecast' });
    return demoForecast();
  }

  const data = await post(
    'forecast:lookup',
    { location: { latitude: lat, longitude: lng }, period: { hours: 24 } },
    forecastResponseSchema,
  );

  const points: ForecastPoint[] = (data.hourlyForecasts ?? []).slice(0, 24).map((hour) => {
    // Prefer CPCB aggregation from forecast pollutants so the chart uses the
    // SAME scale as the gauge; fall back to Google's index only if absent.
    const readings = (hour.pollutants ?? [])
      .map(toReading)
      .filter((r): r is PollutantReading => r !== null);
    const aqi =
      readings.length > 0
        ? computeAqi(Object.fromEntries(readings.map((r) => [r.pollutant, r.concentration]))).aqi
        : (hour.indexes?.[0]?.aqi ?? 0);
    const pm25 =
      readings.find((r) => r.pollutant === 'pm25')?.concentration ??
      hour.pollutants?.find((p) => p.code.toLowerCase() === 'pm25')?.concentration?.value ??
      0;
    return {
      hour: hour.dateTime ? hour.dateTime.slice(11, 16) : '—',
      aqi,
      pm25,
    };
  });

  if (points.length < 6) {
    logWarn('service.demo_fallback', { service: 'air_quality', reason: 'sparse_forecast' });
    return demoForecast();
  }
  return points;
}
