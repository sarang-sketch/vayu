/** Community page: civic pollution feed + protected report submission. */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Flame,
  Loader2,
  MapPin,
  Send,
  TrafficCone,
  Factory,
  Building2,
  CircleDot,
} from 'lucide-react';
import type { CommunityReport } from '@vayusense/shared';
import { Badge, Button, Card, SectionTitle, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime, relativeTime } from '../lib/format';
import { executeRecaptcha } from '../lib/recaptcha';
import { track } from '../lib/analytics';
import { useAppStore } from '../store/useAppStore';

const CATEGORY_META: Record<
  CommunityReport['category'],
  { label: string; icon: typeof Flame; color: string }
> = {
  burning: { label: 'Waste burning', icon: Flame, color: '#ef4444' },
  traffic: { label: 'Traffic / idling', icon: TrafficCone, color: '#f97316' },
  construction: { label: 'Construction dust', icon: Building2, color: '#eab308' },
  industry: { label: 'Industrial', icon: Factory, color: '#a855f7' },
  other: { label: 'Other', icon: CircleDot, color: '#2dd4bf' },
};

function sentimentColor(score: number): string {
  if (score <= -0.4) return '#ef4444';
  if (score < 0.2) return '#eab308';
  return '#22c55e';
}

export default function CommunityPage() {
  const city = useAppStore((s) => s.city);
  const coords = useAppStore((s) => s.coords);

  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [category, setCategory] = useState<CommunityReport['category']>('burning');
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState(city);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadFeed = useCallback(() => {
    setLoading(true);
    setFeedError(null);
    api
      .reports()
      .then((result) => setReports(result.reports))
      .catch((err: unknown) =>
        setFeedError(err instanceof Error ? err.message : 'Failed to load community feed'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadFeed, [loadFeed]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (description.trim().length < 10) {
      setSubmitError('Please describe the issue in at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const recaptchaToken = await executeRecaptcha('community_report');
      const result = await api.submitReport({
        location: { lat: coords.lat, lng: coords.lng, label: label || city },
        category,
        description: description.trim(),
        severity,
        ...(recaptchaToken ? { recaptchaToken } : {}),
      });
      setReports((prev) => [result.report, ...prev]);
      setDescription('');
      setSubmitted(true);
      track('community_report_submitted', { category, severity });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Community smog watch"
        subtitle="Neighbor-reported pollution sources, triaged with Google Cloud Natural Language sentiment so moderators see the most urgent reports first."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {loading ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : null}
          {feedError ? (
            <Card role="alert">
              <p className="text-sm text-red-300">{feedError}</p>
              <Button variant="ghost" className="mt-3" onClick={loadFeed}>
                Retry
              </Button>
            </Card>
          ) : null}
          {!loading && !feedError
            ? reports.map((report) => {
                const meta = CATEGORY_META[report.category];
                const Icon = meta.icon;
                return (
                  <Card key={report.id} className="animate-fade-up">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={meta.color}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {meta.label}
                      </Badge>
                      <span className="chip">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {report.location.label}
                      </span>
                      <span className="ml-auto text-xs text-mist-500">
                        {relativeTime(report.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-mist-100">{report.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-mist-500">
                      <span>
                        Severity{' '}
                        <span className="font-semibold text-amber-300">{report.severity}/5</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: sentimentColor(report.sentimentScore) }}
                        />
                        Sentiment {report.sentimentScore.toFixed(1)}
                      </span>
                      <span>{report.authorName}</span>
                      <span className="ml-auto">{formatDateTime(report.createdAt)}</span>
                    </div>
                  </Card>
                );
              })
            : null}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-display text-base font-semibold text-white">Report a source</h3>
            <p className="mt-1 text-xs text-mist-500">
              Protected by reCAPTCHA Enterprise. Reports are public civic data — no personal details
              required.
            </p>
            <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
              <label className="block text-xs text-mist-500">
                Category
                <select
                  className="input mt-1"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as CommunityReport['category'])
                  }
                >
                  {Object.entries(CATEGORY_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-mist-500">
                Location label
                <input
                  className="input mt-1"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="block text-xs text-mist-500">
                Severity: <span className="font-semibold text-amber-300">{severity}/5</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(event) => setSeverity(Number(event.target.value))}
                  className="mt-2 w-full accent-teal-400"
                  aria-label="Severity from 1 to 5"
                />
              </label>
              <label className="block text-xs text-mist-500">
                What is happening?
                <textarea
                  className="input mt-1 min-h-24 resize-y"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  placeholder="e.g. Garbage burning near the school gate since 6 AM…"
                />
              </label>
              {submitError ? (
                <p role="alert" className="text-sm text-red-300">
                  {submitError}
                </p>
              ) : null}
              {submitted && !submitError ? (
                <p role="status" className="text-sm text-teal-300">
                  Report submitted — thank you for protecting your neighborhood.
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {submitting ? 'Submitting…' : 'Submit report'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
