import { describe, expect, it } from 'vitest';
import { CATEGORY_META, categoryOf, computeAqi, computeSubIndex } from './aqi';

describe('CPCB sub-index interpolation', () => {
  it('maps PM2.5 breakpoints to exact index anchors', () => {
    expect(computeSubIndex('pm25', 0)).toBe(0);
    expect(computeSubIndex('pm25', 30)).toBe(50);
    expect(computeSubIndex('pm25', 60)).toBe(100);
    expect(computeSubIndex('pm25', 90)).toBe(200);
    expect(computeSubIndex('pm25', 120)).toBe(300);
    expect(computeSubIndex('pm25', 250)).toBe(400);
  });

  it('linearly interpolates inside a band', () => {
    // 45 µg/m³ sits midway in the 31–60 band → ~75
    expect(computeSubIndex('pm25', 45)).toBe(75);
    // 150 µg/m³ in the 121–250 band → 301 + 99 × 29/129 ≈ 323
    expect(computeSubIndex('pm25', 150)).toBe(323);
  });

  it('caps extreme smog readings at 500 (Severe+)', () => {
    expect(computeSubIndex('pm25', 900)).toBe(500);
    expect(computeSubIndex('pm10', 1200)).toBe(500);
  });

  it('rejects invalid readings', () => {
    expect(computeSubIndex('pm25', -5)).toBeNull();
    expect(computeSubIndex('pm25', Number.NaN)).toBeNull();
  });

  it('truncates fractional readings per CPCB convention (no band-gap artifacts)', () => {
    expect(computeSubIndex('pm25', 60.5)).toBe(100); // floors into the 31–60 band
    expect(computeSubIndex('pm25', 30.9)).toBe(50);
    expect(computeSubIndex('co', 1.05)).toBe(50); // CO truncates to one decimal
    expect(computeSubIndex('co', 2.09)).toBe(100);
  });
});

describe('AQI aggregation', () => {
  it('uses the maximum sub-index and reports the dominant pollutant', () => {
    // PM2.5 60 → sub-index 100; PM10 300 → sub-index 250 (dominant); NO2 40 → 50
    const result = computeAqi({ pm25: 60, pm10: 300, no2: 40 });
    expect(result.dominant).toBe('pm10');
    expect(result.aqi).toBe(computeSubIndex('pm10', 300));
    expect(result.subIndices.pm25).toBe(100);
  });

  it('throws when no valid readings exist', () => {
    expect(() => computeAqi({})).toThrow(/at least one valid pollutant/i);
  });
});

describe('categories and health metadata', () => {
  it('classifies all six CPCB bands', () => {
    expect(categoryOf(25)).toBe('good');
    expect(categoryOf(75)).toBe('satisfactory');
    expect(categoryOf(150)).toBe('moderate');
    expect(categoryOf(250)).toBe('poor');
    expect(categoryOf(350)).toBe('very_poor');
    expect(categoryOf(480)).toBe('severe');
  });

  it('recommends masks and closed windows during winter smog', () => {
    const severe = CATEGORY_META[categoryOf(450)];
    expect(severe.maskRecommended).toBe(true);
    expect(severe.ventilation).toBe('avoid');
    expect(severe.outdoorActivity).toBe('avoid');
  });
});
