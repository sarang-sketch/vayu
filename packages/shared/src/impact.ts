/**
 * Sustainable-swap impact engine.
 *
 * Every swap carries baseline vs alternative emission factors so the app can
 * show families a *clear, quantified impact* (kg CO₂e and grams of PM2.5
 * avoided) rather than vague green claims.
 *
 * Factors are illustrative planning estimates compiled from public Indian
 * urban-emission literature (CEEW/TERI transport studies, CPCB source
 * apportionment, IPCC AR6 GWP100). They are deliberately conservative and
 * documented so reviewers can audit the math.
 * @module @vayusense/shared/impact
 */
import type { SwapDefinition, SwapImpact } from './types';

/** kg CO₂ absorbed by one mature tree per year (urban India estimate). */
export const TREE_CO2_KG_PER_YEAR = 21;
/** Average petrol car emission factor used for "car-km equivalent". */
export const CAR_CO2_KG_PER_KM = 0.17;

export const SWAPS: SwapDefinition[] = [
  {
    id: 'car-to-metro',
    title: 'Drive → Metro',
    from: 'Petrol car commute',
    to: 'Metro / train',
    unit: 'km',
    baseline: { co2eKg: 0.17, pm25G: 0.0045 },
    alternative: { co2eKg: 0.03, pm25G: 0.0005 },
    description:
      'Swap solo car trips for the metro. One carriage replaces ~40 cars and keeps tailpipe PM2.5 out of street canyons.',
    icon: 'train-front',
    effort: 'easy',
  },
  {
    id: 'car-to-bus',
    title: 'Drive → Bus',
    from: 'Petrol car commute',
    to: 'City bus / e-bus',
    unit: 'km',
    baseline: { co2eKg: 0.17, pm25G: 0.0045 },
    alternative: { co2eKg: 0.08, pm25G: 0.0015 },
    description: 'Even a diesel bus halves per-passenger emissions; electric buses cut them ~85%.',
    icon: 'bus',
    effort: 'easy',
  },
  {
    id: 'car-to-cycle',
    title: 'Short drive → Cycle',
    from: 'Car trips under 3 km',
    to: 'Bicycle / walking',
    unit: 'km',
    baseline: { co2eKg: 0.17, pm25G: 0.0045 },
    alternative: { co2eKg: 0, pm25G: 0 },
    description:
      'Half of urban car trips are under 3 km — cold engines pollute most in that window. Zero-emission and healthy.',
    icon: 'bike',
    effort: 'moderate',
  },
  {
    id: 'genset-to-solar',
    title: 'Diesel genset → Solar + storage',
    from: 'Diesel generator backup',
    to: 'Rooftop solar + battery',
    unit: 'kWh',
    baseline: { co2eKg: 0.8, pm25G: 0.3 },
    alternative: { co2eKg: 0.05, pm25G: 0.001 },
    description:
      'Neighbourhood gensets are a major winter PM2.5 source. Community solar + storage removes the smoke entirely.',
    icon: 'sun',
    effort: 'ambitious',
  },
  {
    id: 'burn-to-compost',
    title: 'Waste burning → Composting',
    from: 'Open leaf/garbage burning',
    to: 'Composting / collection',
    unit: 'kg',
    baseline: { co2eKg: 1.8, pm25G: 8 },
    alternative: { co2eKg: 0.1, pm25G: 0.05 },
    description:
      'One kg of burned waste emits ~8 g of PM2.5 — the single most damaging household habit in winter.',
    icon: 'leaf',
    effort: 'easy',
  },
  {
    id: 'lpg-to-induction',
    title: 'LPG stove → Induction',
    from: 'LPG cooking',
    to: 'Induction cooktop',
    unit: 'meal',
    baseline: { co2eKg: 0.35, pm25G: 0.02 },
    alternative: { co2eKg: 0.25, pm25G: 0.005 },
    description:
      'Cuts indoor NO₂ and particulates at the source — the air your family actually breathes at home.',
    icon: 'cooking-pot',
    effort: 'moderate',
  },
  {
    id: 'idling-off',
    title: 'Idling → Engine off',
    from: 'Engine idling at signals/school gates',
    to: 'Engine off while waiting',
    unit: 'minute',
    baseline: { co2eKg: 0.01, pm25G: 0.0004 },
    alternative: { co2eKg: 0, pm25G: 0 },
    description:
      'Idling 2 minutes a day adds up to ~7 kg CO₂e a year — for zero distance travelled.',
    icon: 'power',
    effort: 'easy',
  },
];

/** Look up a swap definition by id. */
export function getSwap(swapId: string): SwapDefinition {
  const swap = SWAPS.find((s) => s.id === swapId);
  if (!swap) throw new Error(`Unknown swap id: ${swapId}`);
  return swap;
}

const round = (value: number, decimals = 2): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/**
 * Quantify the impact of adopting a swap.
 * @param swapId        catalog id (see {@link SWAPS})
 * @param quantityPerDay units of activity per day (km, kWh, kg, meals, minutes)
 * @param daysPerWeek   adoption frequency, 1–7
 */
export function computeSwapImpact(
  swapId: string,
  quantityPerDay: number,
  daysPerWeek: number,
): SwapImpact {
  if (quantityPerDay <= 0) throw new Error('quantityPerDay must be positive');
  if (daysPerWeek < 1 || daysPerWeek > 7) throw new Error('daysPerWeek must be between 1 and 7');

  const swap = getSwap(swapId);
  const weeklyUnits = quantityPerDay * daysPerWeek;
  const weeklyCo2eKg = (swap.baseline.co2eKg - swap.alternative.co2eKg) * weeklyUnits;
  const weeklyPm25G = (swap.baseline.pm25G - swap.alternative.pm25G) * weeklyUnits;
  const yearlyCo2eKg = weeklyCo2eKg * 52;

  return {
    swapId,
    weeklyCo2eKg: round(weeklyCo2eKg),
    weeklyPm25G: round(weeklyPm25G, 3),
    monthlyCo2eKg: round(yearlyCo2eKg / 12),
    yearlyCo2eKg: round(yearlyCo2eKg),
    treesEquivalent: round(yearlyCo2eKg / TREE_CO2_KG_PER_YEAR, 1),
    carKmEquivalent: round(yearlyCo2eKg / CAR_CO2_KG_PER_KM, 0),
  };
}

/** Sum a set of swap impacts into a household/community total. */
export function aggregateImpact(impacts: SwapImpact[]): Omit<SwapImpact, 'swapId'> {
  const total = impacts.reduce(
    (acc, i) => ({
      weeklyCo2eKg: acc.weeklyCo2eKg + i.weeklyCo2eKg,
      weeklyPm25G: acc.weeklyPm25G + i.weeklyPm25G,
      monthlyCo2eKg: acc.monthlyCo2eKg + i.monthlyCo2eKg,
      yearlyCo2eKg: acc.yearlyCo2eKg + i.yearlyCo2eKg,
      treesEquivalent: acc.treesEquivalent + i.treesEquivalent,
      carKmEquivalent: acc.carKmEquivalent + i.carKmEquivalent,
    }),
    {
      weeklyCo2eKg: 0,
      weeklyPm25G: 0,
      monthlyCo2eKg: 0,
      yearlyCo2eKg: 0,
      treesEquivalent: 0,
      carKmEquivalent: 0,
    },
  );
  return {
    weeklyCo2eKg: round(total.weeklyCo2eKg),
    weeklyPm25G: round(total.weeklyPm25G, 3),
    monthlyCo2eKg: round(total.monthlyCo2eKg),
    yearlyCo2eKg: round(total.yearlyCo2eKg),
    treesEquivalent: round(total.treesEquivalent, 1),
    carKmEquivalent: round(total.carKmEquivalent, 0),
  };
}
