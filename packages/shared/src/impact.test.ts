import { describe, expect, it } from 'vitest';
import { aggregateImpact, computeSwapImpact, getSwap, SWAPS } from './impact';

describe('swap catalog', () => {
  it('exposes a quantified baseline and alternative for every swap', () => {
    expect(SWAPS.length).toBeGreaterThanOrEqual(6);
    for (const swap of SWAPS) {
      expect(swap.baseline.co2eKg).toBeGreaterThan(swap.alternative.co2eKg);
      expect(swap.baseline.pm25G).toBeGreaterThan(swap.alternative.pm25G);
    }
  });

  it('rejects unknown swap ids', () => {
    expect(() => getSwap('teleport')).toThrow(/unknown swap id/i);
  });
});

describe('computeSwapImpact', () => {
  it('computes weekly CO₂e and PM2.5 avoided for car→metro', () => {
    // 12 km/day × 5 days × (0.17 − 0.03) kg/km = 8.4 kg CO₂e/week
    const impact = computeSwapImpact('car-to-metro', 12, 5);
    expect(impact.weeklyCo2eKg).toBeCloseTo(8.4, 5);
    expect(impact.weeklyPm25G).toBeCloseTo(0.24, 5);
    expect(impact.yearlyCo2eKg).toBeCloseTo(436.8, 5);
    expect(impact.treesEquivalent).toBeGreaterThan(0);
    expect(impact.carKmEquivalent).toBeGreaterThan(0);
  });

  it('scales linearly with adoption frequency', () => {
    const three = computeSwapImpact('car-to-bus', 10, 3);
    const six = computeSwapImpact('car-to-bus', 10, 6);
    expect(six.weeklyCo2eKg).toBeCloseTo(three.weeklyCo2eKg * 2, 5);
  });

  it('validates inputs', () => {
    expect(() => computeSwapImpact('car-to-metro', 0, 5)).toThrow(/positive/);
    expect(() => computeSwapImpact('car-to-metro', 10, 9)).toThrow(/between 1 and 7/);
  });
});

describe('aggregateImpact', () => {
  it('sums household swaps into a single ledger total', () => {
    const a = computeSwapImpact('car-to-metro', 12, 5);
    const b = computeSwapImpact('burn-to-compost', 2, 7);
    const total = aggregateImpact([a, b]);
    expect(total.weeklyCo2eKg).toBeCloseTo(a.weeklyCo2eKg + b.weeklyCo2eKg, 1);
    expect(total.weeklyPm25G).toBeCloseTo(a.weeklyPm25G + b.weeklyPm25G, 2);
  });

  it('returns zeroes for an empty ledger', () => {
    expect(aggregateImpact([]).yearlyCo2eKg).toBe(0);
  });
});
