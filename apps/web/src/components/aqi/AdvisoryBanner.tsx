/** Health advisory banner with Cloud-Translation-powered Hindi toggle. */
import { useEffect, useState } from 'react';
import { AlertTriangle, Languages, ShieldCheck } from 'lucide-react';
import { CATEGORY_META, type AirQualitySnapshot } from '@vayusense/shared';
import { api } from '../../lib/api';
import { track } from '../../lib/analytics';
import { useAppStore } from '../../store/useAppStore';
import { Badge, cn } from '../ui';

export function AdvisoryBanner({ snapshot }: { snapshot: AirQualitySnapshot }) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const meta = CATEGORY_META[snapshot.category];
  const [advice, setAdvice] = useState(meta.advice);

  useEffect(() => {
    setAdvice(meta.advice);
    if (locale === 'en') return;
    let cancelled = false;
    api
      .translate(meta.advice, locale)
      .then((result) => {
        if (!cancelled) setAdvice(result.translatedText);
      })
      .catch(() => {
        // Keep English advisory if translation is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [meta.advice, locale]);

  const toggleLocale = () => {
    const next = locale === 'en' ? 'hi' : 'en';
    setLocale(next);
    track('advisory_language', { locale: next });
  };

  return (
    <section
      aria-label="Health advisory"
      className="card border-l-4 p-5"
      style={{ borderLeftColor: meta.color }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: meta.color }}
            aria-hidden="true"
          />
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {meta.label} air — health advisory
            </h2>
            <p
              className={cn(
                'mt-1 max-w-2xl text-sm text-mist-300',
                locale === 'hi' && 'font-hindi',
              )}
            >
              {advice}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="chip hover:border-teal-400/60 hover:text-teal-300"
          aria-label={locale === 'en' ? 'Switch advisory to Hindi' : 'Switch advisory to English'}
        >
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          {locale === 'en' ? 'हिंदी' : 'English'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge color={meta.maskRecommended ? '#ef4444' : '#22c55e'}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.maskRecommended ? 'N95 required outdoors' : 'Masks optional'}
        </Badge>
        <Badge color={meta.ventilation === 'avoid' ? '#ef4444' : '#eab308'}>
          Ventilation: {meta.ventilation}
        </Badge>
        <Badge color={meta.outdoorActivity === 'avoid' ? '#ef4444' : '#84cc16'}>
          Outdoor activity: {meta.outdoorActivity}
        </Badge>
      </div>
    </section>
  );
}
