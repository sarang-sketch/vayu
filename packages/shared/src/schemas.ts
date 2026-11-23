/**
 * Zod contracts shared by client and server. Every API payload is validated
 * at the edge; Gemini structured output is validated against the same
 * schemas before it ever reaches the UI (defense against model drift).
 * @module @vayusense/shared/schemas
 */
import { z } from 'zod';

export const personaSchema = z.enum([
  'family_kids',
  'elderly',
  'asthma',
  'commuter',
  'outdoor_worker',
  'school_admin',
]);

export const PERSONA_LABELS: Record<z.infer<typeof personaSchema>, string> = {
  family_kids: 'Family with kids',
  elderly: 'Elderly members',
  asthma: 'Asthma / respiratory',
  commuter: 'Daily commuter',
  outdoor_worker: 'Outdoor worker',
  school_admin: 'School administrator',
};

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  persona: personaSchema.default('family_kids'),
  aqi: z.number().min(0).max(500).optional(),
  city: z.string().max(80).optional(),
  history: z
    .array(z.object({ role: z.enum(['user', 'model']), text: z.string().max(4000) }))
    .max(20)
    .default([]),
});

export const routineRequestSchema = z.object({
  persona: personaSchema,
  city: z.string().min(1).max(80),
  aqi: z.number().min(0).max(500),
  householdSize: z.number().int().min(1).max(12).default(4),
  commuteKm: z.number().min(0).max(200).default(12),
  sensitivities: z.array(z.string().max(40)).max(6).default([]),
});

export const swapImpactRequestSchema = z.object({
  swapId: z.string().min(1).max(40),
  quantityPerDay: z.number().positive().max(10000),
  daysPerWeek: z.number().int().min(1).max(7),
});

export const communityReportSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    label: z.string().min(1).max(120),
  }),
  category: z.enum(['traffic', 'burning', 'construction', 'industry', 'other']),
  description: z.string().min(10).max(500),
  severity: z.number().int().min(1).max(5),
  recaptchaToken: z.string().max(4096).optional(),
});

/** Gemini structured-output contract for a daily routine. */
export const routineStepSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  activity: z.string().min(3).max(160),
  location: z.enum(['indoor', 'outdoor', 'transit']),
  emissionSaving: z.string().max(120),
  healthNote: z.string().max(200),
});

export const dailyRoutineSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(400),
  steps: z.array(routineStepSchema).min(4).max(12),
  estimatedCo2eSavedKg: z.number().min(0).max(100),
});

/** Gemini structured-output contract for assistant chat replies. */
export const chatResponseSchema = z.object({
  reply: z.string().min(1).max(4000),
  suggestedActions: z
    .array(z.object({ label: z.string().max(60), prompt: z.string().max(200) }))
    .max(4)
    .optional(),
});

/** Validated shape of a cached/served air quality snapshot (cache integrity). */
export const airQualitySnapshotSchema = z.object({
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string() }),
  aqi: z.number().min(0).max(500),
  category: z.enum(['good', 'satisfactory', 'moderate', 'poor', 'very_poor', 'severe']),
  dominant: z.enum(['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3']),
  pollutants: z.array(
    z.object({
      pollutant: z.enum(['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3']),
      concentration: z.number().min(0),
      unit: z.enum(['µg/m³', 'mg/m³']),
    }),
  ),
  observedAt: z.string(),
  source: z.enum(['google_air_quality', 'demo']),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type RoutineRequest = z.infer<typeof routineRequestSchema>;
export type SwapImpactRequest = z.infer<typeof swapImpactRequestSchema>;
export type CommunityReportInput = z.infer<typeof communityReportSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
