import { describe, expect, it } from 'vitest';
import { buildChatSystemPrompt, buildRoutineSystemPrompt, buildRoutineUserPrompt } from './prompts';

describe('prompt engineering', () => {
  it('embeds persona, conditions and safety rails in the chat system prompt', () => {
    const prompt = buildChatSystemPrompt({
      message: 'hi',
      persona: 'asthma',
      aqi: 430,
      city: 'Delhi',
      history: [],
    });
    expect(prompt).toContain('Asthma / respiratory');
    expect(prompt).toContain('AQI: 430');
    expect(prompt).toContain('NOT a doctor');
    expect(prompt).toContain('JSON');
  });

  it('instructs routine generation to avoid inversion peaks and quantify savings', () => {
    const prompt = buildRoutineSystemPrompt();
    expect(prompt).toContain('06:00-10:00');
    expect(prompt).toContain('CO₂e');
    expect(prompt).toContain('HH:MM');
  });

  it('serializes household context into the routine user prompt', () => {
    const prompt = buildRoutineUserPrompt({
      persona: 'family_kids',
      city: 'Delhi',
      aqi: 415,
      householdSize: 5,
      commuteKm: 14,
      sensitivities: ['dust allergy'],
    });
    expect(prompt).toContain('Delhi');
    expect(prompt).toContain('14 km');
    expect(prompt).toContain('dust allergy');
  });
});
