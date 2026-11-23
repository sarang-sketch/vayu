/** 24-hour AQI forecast — hand-rolled SVG area chart with CPCB bands. */
import type { ForecastPoint } from '@vayusense/shared';

const W = 720;
const H = 240;
const PAD = { left: 42, right: 12, top: 14, bottom: 28 };
const Y_MAX = 500;

const BANDS = [
  { from: 0, to: 50, color: '#22c55e' },
  { from: 51, to: 100, color: '#84cc16' },
  { from: 101, to: 200, color: '#eab308' },
  { from: 201, to: 300, color: '#f97316' },
  { from: 301, to: 400, color: '#ef4444' },
  { from: 401, to: 500, color: '#991b1b' },
];

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  if (points.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * plotW;
  const y = (aqi: number) => PAD.top + (1 - Math.min(aqi, Y_MAX) / Y_MAX) * plotH;

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.aqi).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`24-hour AQI forecast, peak ${Math.max(...points.map((p) => p.aqi))}`}
    >
      <defs>
        <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {BANDS.map((band) => (
        <rect
          key={band.from}
          x={PAD.left}
          y={y(band.to)}
          width={plotW}
          height={y(band.from) - y(band.to)}
          fill={band.color}
          opacity="0.06"
        />
      ))}

      {[100, 200, 300, 400, 500].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#1f3050"
            strokeDasharray="3 5"
          />
          <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#8296b0">
            {tick}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#forecast-fill)" />
      <path d={line} fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinejoin="round" />

      {points.map((p, i) =>
        i % 4 === 0 ? (
          <text key={p.hour} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#8296b0">
            {p.hour}
          </text>
        ) : null,
      )}
    </svg>
  );
}
