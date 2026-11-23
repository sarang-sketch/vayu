/** Chronological timeline of a Gemini-generated low-emission routine. */
import { HeartPulse, Home, Leaf, Sun, TrainFront } from 'lucide-react';
import type { DailyRoutine, RoutineStep } from '@vayusense/shared';
import { Badge, Card } from '../ui';

const LOCATION_ICON: Record<RoutineStep['location'], typeof Home> = {
  indoor: Home,
  outdoor: Sun,
  transit: TrainFront,
};

export function RoutineTimeline({ routine }: { routine: DailyRoutine }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">{routine.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-mist-500">{routine.summary}</p>
        </div>
        <Badge color="#2dd4bf">
          <Leaf className="h-3.5 w-3.5" aria-hidden="true" />~{routine.estimatedCo2eSavedKg} kg CO₂e
          saved today
        </Badge>
      </div>

      <ol className="mt-5 space-y-4">
        {routine.steps.map((step) => {
          const Icon = LOCATION_ICON[step.location];
          return (
            <li key={`${step.time}-${step.activity}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="rounded-lg bg-ink-700 px-2 py-1 font-mono text-xs font-semibold text-teal-300">
                  {step.time}
                </span>
                <span className="mt-1 w-px flex-1 bg-ink-600" aria-hidden="true" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-mist-500" aria-hidden="true" />
                  <p className="text-sm font-medium text-mist-100">{step.activity}</p>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-teal-300">
                  <Leaf className="h-3 w-3" aria-hidden="true" />
                  {step.emissionSaving}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-300/90">
                  <HeartPulse className="h-3 w-3" aria-hidden="true" />
                  {step.healthNote}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
