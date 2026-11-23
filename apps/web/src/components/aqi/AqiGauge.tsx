/** Radial AQI gauge (SVG, animated, accessible). */
import { CATEGORY_META, type AqiCategory, type Pollutant } from '@vayusense/shared';

const POLLUTANT_LABELS: Record<Pollutant, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  so2: 'SO₂',
  co: 'CO',
  nh3: 'NH₃',
};

const ARC_LENGTH = Math.PI * 90; // semicircle, r = 90

export function AqiGauge({
  aqi,
  category,
  dominant,
}: {
  aqi: number;
  category: AqiCategory;
  dominant: Pollutant;
}) {
  const meta = CATEGORY_META[category];
  const fraction = Math.min(Math.max(aqi / 500, 0), 1);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 220 132"
        className="w-full max-w-[280px]"
        role="img"
        aria-label={`Air Quality Index ${aqi}, category ${meta.label}, dominant pollutant ${POLLUTANT_LABELS[dominant]}`}
      >
        <path
          d="M 20 120 A 90 90 0 0 1 200 120"
          fill="none"
          stroke="#1f3050"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 20 120 A 90 90 0 0 1 200 120"
          fill="none"
          stroke={meta.color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${fraction * ARC_LENGTH} ${ARC_LENGTH}`}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }}
        />
        <text
          x="110"
          y="92"
          textAnchor="middle"
          className="fill-white font-display"
          fontSize="44"
          fontWeight="700"
        >
          {aqi}
        </text>
        <text x="110" y="114" textAnchor="middle" fill={meta.color} fontSize="13" fontWeight="600">
          {meta.label.toUpperCase()}
        </text>
      </svg>
      <p className="mt-1 text-xs text-mist-500">
        Dominant pollutant:{' '}
        <span className="font-semibold text-mist-100">{POLLUTANT_LABELS[dominant]}</span> · CPCB
        scale 0–500
      </p>
    </div>
  );
}
