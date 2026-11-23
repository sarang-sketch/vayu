/** Dashboard: live AQI, health advisory, forecast, pollutants, quick actions. */
import { Link } from 'react-router-dom';
import { ArrowRight, Fan, MessageCircle, Recycle, RefreshCw, Wind } from 'lucide-react';
import { CATEGORY_META } from '@vayusense/shared';
import { AqiGauge } from '../components/aqi/AqiGauge';
import { AdvisoryBanner } from '../components/aqi/AdvisoryBanner';
import { ForecastChart } from '../components/aqi/ForecastChart';
import { PollutantGrid } from '../components/aqi/PollutantGrid';
import { Badge, Button, Card, SectionTitle, Skeleton, Stat } from '../components/ui';
import { useAirQuality } from '../hooks/useAirQuality';
import { formatDateTime } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

const QUICK_ACTIONS = [
  {
    to: '/assistant',
    icon: MessageCircle,
    title: 'Ask VayuSense',
    body: 'Gemini-personalized answers for your household.',
  },
  {
    to: '/indoor',
    icon: Fan,
    title: 'Indoor air hacks',
    body: 'Purification, ventilation timing and DIY fixes.',
  },
  {
    to: '/swaps',
    icon: Recycle,
    title: 'Sustainable swaps',
    body: 'Quantified CO₂e and PM2.5 savings you can adopt today.',
  },
];

export default function DashboardPage() {
  const city = useAppStore((s) => s.city);
  const coords = useAppStore((s) => s.coords);
  const { snapshot, forecast, loading, error, refresh } = useAirQuality(coords, city);

  const cleanestHour =
    forecast.length > 0
      ? forecast.reduce((best, point) => (point.aqi < best.aqi ? point : best), forecast[0])
      : null;
  const pm25 = snapshot?.pollutants.find((p) => p.pollutant === 'pm25');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-mist-500">
            Winter smog watch · {formatDateTime(new Date().toISOString())}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">{city}</h1>
        </div>
        <Button variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card role="alert" className="border-red-500/40">
          <p className="text-sm text-red-300">{error}</p>
          <Button variant="ghost" className="mt-3" onClick={refresh}>
            Try again
          </Button>
        </Card>
      ) : null}

      {loading && !snapshot ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center">
              <AqiGauge
                aqi={snapshot.aqi}
                category={snapshot.category}
                dominant={snapshot.dominant}
              />
              <div className="mt-3 flex items-center gap-2">
                <Badge color={CATEGORY_META[snapshot.category].color}>
                  {snapshot.source === 'demo' ? 'Demo scenario' : 'Google Air Quality API'}
                </Badge>
                <span className="text-xs text-mist-500">{formatDateTime(snapshot.observedAt)}</span>
              </div>
            </Card>
            <div className="lg:col-span-2">
              <AdvisoryBanner snapshot={snapshot} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="PM2.5 now"
              value={pm25 ? `${pm25.concentration} µg/m³` : '—'}
              hint="WHO 24h guideline: 15 µg/m³"
              icon={<Wind className="h-5 w-5" aria-hidden="true" />}
            />
            <Stat
              label="Best ventilation window"
              value={cleanestHour ? cleanestHour.hour : '—'}
              hint={cleanestHour ? `AQI dips to ~${cleanestHour.aqi}` : 'Forecast loading'}
            />
            <Stat
              label="Mask guidance"
              value={CATEGORY_META[snapshot.category].maskRecommended ? 'N95 outdoors' : 'Optional'}
              hint={CATEGORY_META[snapshot.category].label + ' category'}
            />
          </div>

          <section>
            <SectionTitle
              title="24-hour outlook"
              subtitle="Winter inversion traps smoke near the ground overnight — plan around the peaks."
            />
            <Card>
              <ForecastChart points={forecast} />
            </Card>
          </section>

          <section>
            <SectionTitle
              title="Pollutants"
              subtitle="CPCB sub-indices computed from station concentrations."
            />
            <PollutantGrid readings={snapshot.pollutants} />
          </section>
        </>
      ) : null}

      <section>
        <SectionTitle title="Act now" />
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, title, body }) => (
            <Link key={to} to={to} className="group">
              <Card className="h-full transition group-hover:border-teal-400/50">
                <Icon className="h-5 w-5 text-teal-300" aria-hidden="true" />
                <h3 className="mt-2 font-display text-base font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-mist-500">{body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-300">
                  Open{' '}
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
