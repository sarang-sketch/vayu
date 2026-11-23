/** Sustainable-swap card with live quantified impact and adoption toggle. */
import { useMemo, useState } from 'react';
import {
  Bike,
  Bus,
  Check,
  CookingPot,
  Leaf,
  Power,
  Sun,
  TrainFront,
  type LucideIcon,
} from 'lucide-react';
import { computeSwapImpact, type SwapDefinition } from '@vayusense/shared';
import { formatNumber } from '../../lib/format';
import { track } from '../../lib/analytics';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Button, Card } from '../ui';

const ICONS: Record<string, LucideIcon> = {
  'train-front': TrainFront,
  bus: Bus,
  bike: Bike,
  sun: Sun,
  leaf: Leaf,
  'cooking-pot': CookingPot,
  power: Power,
};

const DEFAULT_QUANTITY: Record<SwapDefinition['unit'], number> = {
  km: 12,
  kWh: 3,
  kg: 2,
  meal: 3,
  minute: 4,
};

const EFFORT_COLOR: Record<SwapDefinition['effort'], string> = {
  easy: '#22c55e',
  moderate: '#eab308',
  ambitious: '#f97316',
};

export function SwapCard({ swap }: { swap: SwapDefinition }) {
  const adopted = useAppStore((s) => s.adoptedSwaps[swap.id]);
  const adoptSwap = useAppStore((s) => s.adoptSwap);
  const removeSwap = useAppStore((s) => s.removeSwap);

  const [quantity, setQuantity] = useState(adopted?.quantityPerDay ?? DEFAULT_QUANTITY[swap.unit]);
  const [days, setDays] = useState(adopted?.daysPerWeek ?? 5);

  const impact = useMemo(
    () => computeSwapImpact(swap.id, Math.max(quantity, 0.1), days),
    [swap.id, quantity, days],
  );

  const Icon = ICONS[swap.icon] ?? Leaf;
  const isAdopted = Boolean(adopted);

  const toggleAdoption = () => {
    if (isAdopted) {
      removeSwap(swap.id);
      track('swap_removed', { swapId: swap.id });
    } else {
      adoptSwap(swap.id, { quantityPerDay: quantity, daysPerWeek: days });
      track('swap_adopted', { swapId: swap.id, weeklyCo2eKg: impact.weeklyCo2eKg });
    }
  };

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">{swap.title}</h3>
            <p className="text-xs text-mist-500">
              {swap.from} → {swap.to}
            </p>
          </div>
        </div>
        <Badge color={EFFORT_COLOR[swap.effort]}>{swap.effort}</Badge>
      </div>

      <p className="mt-3 text-sm text-mist-300">{swap.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-xs text-mist-500">
          {swap.unit} per day
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 0.1)}
            className="input mt-1"
            aria-label={`${swap.title}: ${swap.unit} per day`}
          />
        </label>
        <label className="text-xs text-mist-500">
          days per week
          <input
            type="number"
            min={1}
            max={7}
            value={days}
            onChange={(event) => setDays(Math.min(7, Math.max(1, Number(event.target.value) || 1)))}
            className="input mt-1"
            aria-label={`${swap.title}: days per week`}
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-ink-900/70 p-3">
        <div>
          <p className="text-xs text-mist-500">CO₂e avoided / week</p>
          <p className="font-display text-lg font-semibold text-teal-300">
            {formatNumber(impact.weeklyCo2eKg, 1)} kg
          </p>
        </div>
        <div>
          <p className="text-xs text-mist-500">PM2.5 avoided / week</p>
          <p className="font-display text-lg font-semibold text-amber-300">
            {formatNumber(impact.weeklyPm25G, 2)} g
          </p>
        </div>
      </div>

      <Button
        variant={isAdopted ? 'ghost' : 'primary'}
        className="mt-4"
        onClick={toggleAdoption}
        aria-pressed={isAdopted}
      >
        {isAdopted ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" /> Adopted — tap to remove
          </>
        ) : (
          'Adopt this swap'
        )}
      </Button>
    </Card>
  );
}
