import { describe, expect, it } from 'vitest';
import {
  chatRequestSchema,
  communityReportSchema,
  dailyRoutineSchema,
  routineRequestSchema,
} from './schemas';

describe('API request contracts', () => {
  it('applies safe defaults to chat requests', () => {
    const parsed = chatRequestSchema.parse({ message: 'Is it safe to jog today?' });
    expect(parsed.persona).toBe('family_kids');
    expect(parsed.history).toEqual([]);
  });

  it('rejects oversized chat messages (prompt-injection surface control)', () => {
    expect(chatRequestSchema.safeParse({ message: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects out-of-range AQI values', () => {
    expect(
      routineRequestSchema.safeParse({ persona: 'asthma', city: 'Delhi', aqi: 9000 }).success,
    ).toBe(false);
  });

  it('enforces civic-report quality rules', () => {
    const valid = {
      location: { lat: 28.61, lng: 77.2, label: 'Anand Vihar' },
      category: 'burning',
      description: 'Garbage burning near the school gate since 6 AM.',
      severity: 4,
    };
    expect(communityReportSchema.safeParse(valid).success).toBe(true);
    expect(communityReportSchema.safeParse({ ...valid, description: 'short' }).success).toBe(false);
    expect(communityReportSchema.safeParse({ ...valid, severity: 9 }).success).toBe(false);
  });
});

describe('Gemini structured-output contract', () => {
  const validRoutine = {
    title: 'Smog-safe family day',
    summary: 'A low-emission routine keeping the family indoors during peak smog hours.',
    steps: [
      {
        time: '07:00',
        activity: 'Indoor yoga with purifier on high',
        location: 'indoor',
        emissionSaving: 'No car warm-up idling',
        healthNote: 'Avoids morning PM2.5 peak',
      },
      {
        time: '09:30',
        activity: 'Metro commute instead of driving',
        location: 'transit',
        emissionSaving: '1.7 kg CO₂e avoided',
        healthNote: 'N95 for last-mile walk',
      },
      {
        time: '13:00',
        activity: 'Cook on induction; windows sealed',
        location: 'indoor',
        emissionSaving: '0.1 kg CO₂e per meal',
        healthNote: 'Lower indoor NO₂',
      },
      {
        time: '18:00',
        activity: 'Indoor board games instead of park visit',
        location: 'indoor',
        emissionSaving: 'Zero-emission evening',
        healthNote: 'Evening smog peak avoided',
      },
    ],
    estimatedCo2eSavedKg: 2.4,
  };

  it('accepts a well-formed routine', () => {
    expect(dailyRoutineSchema.safeParse(validRoutine).success).toBe(true);
  });

  it('rejects malformed model output (time format, step count)', () => {
    expect(
      dailyRoutineSchema.safeParse({
        ...validRoutine,
        steps: [{ ...validRoutine.steps[0], time: '7am' }],
      }).success,
    ).toBe(false);
    expect(dailyRoutineSchema.safeParse({ ...validRoutine, steps: [] }).success).toBe(false);
  });
});
