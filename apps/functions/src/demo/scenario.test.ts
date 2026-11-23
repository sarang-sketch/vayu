import { describe, expect, it } from 'vitest';
import { dailyRoutineSchema, type Persona } from '@vayusense/shared';
import {
  buildDemoChatReply,
  buildDemoRoutine,
  demoForecast,
  demoSnapshot,
  DEMO_WARDS,
} from './scenario';

describe('demo winter-smog scenario', () => {
  it('represents a Severe episode dominated by PM2.5', () => {
    const snapshot = demoSnapshot();
    expect(snapshot.aqi).toBeGreaterThan(400);
    expect(snapshot.category).toBe('severe');
    expect(snapshot.dominant).toBe('pm25');
    expect(snapshot.source).toBe('demo');
  });

  it('produces a full 24-hour forecast with double peaks', () => {
    const forecast = demoForecast();
    expect(forecast).toHaveLength(24);
    const morning = forecast[8].aqi;
    const midday = forecast[14].aqi;
    expect(morning).toBeGreaterThan(midday);
  });

  it('covers 12 Delhi wards for the heatmap', () => {
    expect(DEMO_WARDS.length).toBe(12);
    for (const ward of DEMO_WARDS) {
      expect(ward.aqi).toBeGreaterThan(300);
    }
  });
});

describe('demo Gemini fallbacks', () => {
  const personas: Persona[] = [
    'family_kids',
    'elderly',
    'asthma',
    'commuter',
    'outdoor_worker',
    'school_admin',
  ];

  it('generates schema-valid routines for every persona', () => {
    for (const persona of personas) {
      const routine = buildDemoRoutine({
        persona,
        city: 'Delhi',
        aqi: 415,
        householdSize: 4,
        commuteKm: 12,
        sensitivities: [],
      });
      expect(dailyRoutineSchema.safeParse(routine).success).toBe(true);
      expect(routine.estimatedCo2eSavedKg).toBeGreaterThan(0);
    }
  });

  it('routes exercise questions to exposure advice', () => {
    const reply = buildDemoChatReply('Can I jog outside today?', 'commuter', 415);
    expect(reply.reply).toMatch(/indoor/i);
    expect(reply.suggestedActions?.length).toBeGreaterThan(0);
  });

  it('falls back to a persona-aware summary for open questions', () => {
    const reply = buildDemoChatReply('What should we do today?', 'school_admin', 450);
    expect(reply.reply).toContain('450');
    expect(reply.reply).toContain('school');
  });
});
