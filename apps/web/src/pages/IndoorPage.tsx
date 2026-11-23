/** Indoor air quality playbook: hacks, DIY purification, ventilation timing. */
import { Droplets, Fan, Flame, Home, ShieldCheck, Wind } from 'lucide-react';
import { CATEGORY_META } from '@vayusense/shared';
import { Badge, Card, SectionTitle } from '../components/ui';
import { useAirQuality } from '../hooks/useAirQuality';
import { useAppStore } from '../store/useAppStore';

interface IndoorHack {
  title: string;
  effectiveness: number;
  cost: string;
  body: string;
  icon: typeof Fan;
}

const HACKS: IndoorHack[] = [
  {
    title: 'Seal the envelope',
    effectiveness: 40,
    cost: '₹0–200',
    body: 'Close windows and use damp towels or weather tape on door gaps during peak hours. Stops 30–50% of outdoor PM2.5 infiltration.',
    icon: Home,
  },
  {
    title: 'Right-size a HEPA purifier',
    effectiveness: 85,
    cost: '₹8,000+',
    body: 'Pick CADR ≥ room volume × 3 per hour. Run on high during peaks, sleep mode overnight. Keep doors closed for the clean-air bubble.',
    icon: Fan,
  },
  {
    title: 'Cook smart',
    effectiveness: 55,
    cost: '₹0–3,500',
    body: 'Use the exhaust hood, prefer induction or pressure cooking, and never fry without ventilation. Indoor NO₂ and ultrafines drop sharply.',
    icon: Flame,
  },
  {
    title: 'Wet-mop, don’t sweep',
    effectiveness: 35,
    cost: '₹0',
    body: 'Dry sweeping resuspends settled dust. Wet-mopping and damp dusting remove it; vacuum only with a sealed HEPA unit.',
    icon: Droplets,
  },
  {
    title: 'Time your ventilation',
    effectiveness: 45,
    cost: '₹0',
    body: 'Flush indoor air only in the mid-afternoon dip (often 1–4 PM) when AQI is lowest — 10–15 minutes of cross-ventilation, then reseal.',
    icon: Wind,
  },
  {
    title: 'Green buffers (supporting role)',
    effectiveness: 10,
    cost: '₹300+',
    body: 'Dense hedges on balconies filter some coarse dust; they are NOT a substitute for filtration. Avoid overwatering-induced mold.',
    icon: ShieldCheck,
  },
];

export default function IndoorPage() {
  const city = useAppStore((s) => s.city);
  const coords = useAppStore((s) => s.coords);
  const { snapshot, forecast } = useAirQuality(coords, city);

  const ventilation = snapshot ? CATEGORY_META[snapshot.category].ventilation : 'limited';
  const cleanestHour =
    forecast.length > 0
      ? forecast.reduce((best, p) => (p.aqi < best.aqi ? p : best), forecast[0])
      : null;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Indoor air quality hacks"
        subtitle="You spend ~90% of winter indoors. Here is how to make that air genuinely cleaner."
      />

      <Card className="border-teal-400/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Ventilation advisor — right now
            </h3>
            <p className="mt-1 text-sm text-mist-500">
              {ventilation === 'avoid'
                ? 'Keep windows sealed. Outdoor air is more polluted than your indoor air.'
                : ventilation === 'limited'
                  ? 'Ventilate briefly in the cleanest window only.'
                  : 'Air is clean enough to ventilate freely.'}
              {cleanestHour
                ? ` Today's best window: around ${cleanestHour.hour} (AQI ~${cleanestHour.aqi}).`
                : ''}
            </p>
          </div>
          <Badge
            color={
              ventilation === 'avoid'
                ? '#ef4444'
                : ventilation === 'limited'
                  ? '#eab308'
                  : '#22c55e'
            }
          >
            {ventilation.toUpperCase()}
          </Badge>
        </div>
      </Card>

      <Card className="border-amber-400/40">
        <Badge color="#fbbf24">Featured DIY · ~₹3,500</Badge>
        <h3 className="mt-2 font-display text-lg font-semibold text-white">
          Corsi-Rosenthal box — a ₹3,500 purifier that rivals ₹25,000 units
        </h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-mist-300">
          <li>Tape four MERV-13 furnace filters into a square box (arrows pointing inward).</li>
          <li>Mount a 20-inch box fan on top, blowing outward; seal every seam with tape.</li>
          <li>Add a cardboard shroud on the fan to cut turbulence and noise.</li>
          <li>Run on medium: ~600 m³/h clean air delivery — enough for a 40 m² room.</li>
          <li>Replace filters every 2–3 smog months; check for dust loading monthly.</li>
        </ol>
        <p className="mt-3 text-xs text-mist-500">
          Widely validated in classroom studies; ideal for schools and community halls during Severe
          episodes.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HACKS.map(({ title, effectiveness, cost, body, icon: Icon }) => (
          <Card key={title} className="flex flex-col">
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-teal-300" aria-hidden="true" />
              <span className="chip">{cost}</span>
            </div>
            <h3 className="mt-2 font-display text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 flex-1 text-sm text-mist-500">{body}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-mist-500">
                <span>Exposure reduction</span>
                <span className="font-semibold text-teal-300">~{effectiveness}%</span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-600"
                role="progressbar"
                aria-valuenow={effectiveness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${title} effectiveness`}
              >
                <div
                  className="h-full rounded-full bg-teal-400"
                  style={{ width: `${effectiveness}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
