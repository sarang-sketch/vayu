/** Live air quality + 24 h forecast, with abort-safe fetching and refresh. */
import { useCallback, useEffect, useState } from 'react';
import type { AirQualitySnapshot, ForecastPoint } from '@vayusense/shared';
import { api } from '../lib/api';

interface AirQualityState {
  snapshot: AirQualitySnapshot | null;
  forecast: ForecastPoint[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAirQuality(
  coords: { lat: number; lng: number },
  label: string,
): AirQualityState {
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      api.currentAirQuality(coords.lat, coords.lng, label),
      api.forecast(coords.lat, coords.lng),
    ])
      .then(([current, outlook]) => {
        if (controller.signal.aborted) return;
        setSnapshot(current);
        setForecast(outlook.points);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load air quality');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [coords.lat, coords.lng, label, tick]);

  return { snapshot, forecast, loading, error, refresh };
}
