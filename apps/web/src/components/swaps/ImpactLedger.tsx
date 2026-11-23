/** Household impact ledger — aggregates adopted swaps into clear equivalents. */
import { useMemo } from 'react';
import { Car, TreePine, Wind } from 'lucide-react';
import { aggregateImpact, computeSwapImpact, getSwap } from '@vayusense/shared';
import { formatNumber } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import { EmptyState, SectionTitle, Stat } from '../ui';

export function ImpactLedger() {
  const adoptedSwaps = useAppStore((s) => s.adoptedSwaps);

  const { total, rows } = useMemo(() => {
    const impacts = Object.entries(adoptedSwaps).map(([swapId, config]) =>
      computeSwapImpact(swapId, config.quantityPerDay, config.daysPerWeek),
    );
    return {
      total: aggregateImpact(impacts),
      rows: impacts.map((impact) => ({ impact, swap: getSwap(impact.swapId) })),
    };
  }, [adoptedSwaps]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Your impact ledger is empty"
        body="Adopt sustainable swaps above and watch your household's CO₂e and PM2.5 savings add up — with tree and car-km equivalents."
      />
    );
  }

  return (
    <section aria-label="Household impact ledger">
      <SectionTitle
        title="Your weekly impact"
        subtitle="Quantified with documented emission factors — no vague green claims."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="CO₂e / week"
          value={`${formatNumber(total.weeklyCo2eKg, 1)} kg`}
          hint={`${formatNumber(total.yearlyCo2eKg, 0)} kg per year`}
          icon={<Wind className="h-5 w-5" aria-hidden="true" />}
        />
        <Stat
          label="PM2.5 / week"
          value={`${formatNumber(total.weeklyPm25G, 2)} g`}
          hint="Directly less smog in your airshed"
          icon={<Wind className="h-5 w-5" aria-hidden="true" />}
        />
        <Stat
          label="Tree equivalent"
          value={`${formatNumber(total.treesEquivalent, 1)} trees`}
          hint="Annual CO₂ absorption matched"
          icon={<TreePine className="h-5 w-5" aria-hidden="true" />}
        />
        <Stat
          label="Car-km equivalent"
          value={`${formatNumber(total.carKmEquivalent, 0)} km`}
          hint="Driving distance offset per year"
          icon={<Car className="h-5 w-5" aria-hidden="true" />}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map(({ impact, swap }) => (
          <li
            key={swap.id}
            className="flex items-center justify-between rounded-xl border border-ink-600/60 bg-ink-800/60 px-4 py-2.5 text-sm"
          >
            <span className="text-mist-100">{swap.title}</span>
            <span className="text-mist-500">
              {formatNumber(impact.weeklyCo2eKg, 1)} kg CO₂e · {formatNumber(impact.weeklyPm25G, 2)}{' '}
              g PM2.5 / week
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
