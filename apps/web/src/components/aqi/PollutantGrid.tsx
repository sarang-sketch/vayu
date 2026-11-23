/** Pollutant concentration cards with CPCB sub-index bars. */
import {
  CATEGORY_META,
  categoryOf,
  computeSubIndex,
  type Pollutant,
  type PollutantReading,
} from '@vayusense/shared';
import { Card } from '../ui';

const LABELS: Record<Pollutant, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  so2: 'SO₂',
  co: 'CO',
  nh3: 'NH₃',
};

export function PollutantGrid({ readings }: { readings: PollutantReading[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {readings.map((reading) => {
        const sub = computeSubIndex(reading.pollutant, reading.concentration) ?? 0;
        const color = CATEGORY_META[categoryOf(sub)].color;
        return (
          <Card key={reading.pollutant} className="p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-mist-100">{LABELS[reading.pollutant]}</p>
              <p className="text-xs text-mist-500">sub-index {sub}</p>
            </div>
            <p className="mt-1 font-display text-xl font-semibold text-white">
              {reading.concentration}
              <span className="ml-1 text-xs font-normal text-mist-500">{reading.unit}</span>
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-600"
              role="progressbar"
              aria-valuenow={sub}
              aria-valuemin={0}
              aria-valuemax={500}
              aria-label={`${LABELS[reading.pollutant]} sub-index`}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(sub / 5, 100)}%`, backgroundColor: color }}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
