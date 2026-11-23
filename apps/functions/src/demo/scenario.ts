/**
 * Deterministic winter-smog scenario (Delhi NCR, "Severe" episode).
 *
 * When Google API keys are absent, every service serves this scenario so the
 * full product — dashboard, assistant, map, swaps, community — remains
 * coherent and explorable. Data is fixed (no randomness) so demos, tests and
 * screenshots are reproducible.
 */
import {
  computeAqi,
  computeSwapImpact,
  categoryOf,
  type AirQualitySnapshot,
  type ChatResponse,
  type CommunityReport,
  type DailyRoutine,
  type ForecastPoint,
  type Persona,
  type PollutantReading,
  type RoutineRequest,
} from '@vayusense/shared';

export const DEMO_LOCATION = { lat: 28.6139, lng: 77.209, label: 'New Delhi' };

const DEMO_CONCENTRATIONS = { pm25: 285, pm10: 420, no2: 96, o3: 42, so2: 28, co: 3.4, nh3: 210 };

const UNIT_BY_POLLUTANT: Record<string, 'µg/m³' | 'mg/m³'> = { co: 'mg/m³' };

export function demoReadings(): PollutantReading[] {
  return Object.entries(DEMO_CONCENTRATIONS).map(([pollutant, concentration]) => ({
    pollutant: pollutant as PollutantReading['pollutant'],
    concentration,
    unit: UNIT_BY_POLLUTANT[pollutant] ?? 'µg/m³',
  }));
}

export function demoSnapshot(label = DEMO_LOCATION.label): AirQualitySnapshot {
  const result = computeAqi(DEMO_CONCENTRATIONS);
  return {
    location: { ...DEMO_LOCATION, label },
    aqi: result.aqi,
    category: categoryOf(result.aqi),
    dominant: result.dominant,
    pollutants: demoReadings(),
    observedAt: '2026-11-23T08:00:00+05:30',
    source: 'demo',
  };
}

/** 24-hour forecast with the classic double-peak winter inversion pattern. */
export function demoForecast(): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const morningPeak = Math.exp(-((hour - 8) ** 2) / 8);
    const eveningPeak = Math.exp(-((hour - 22) ** 2) / 10);
    const aqi = Math.round(330 + 95 * morningPeak + 110 * eveningPeak);
    points.push({
      hour: `${String(hour).padStart(2, '0')}:00`,
      aqi,
      pm25: Math.round(aqi * 0.62),
    });
  }
  return points;
}

/** Ward-level cells used by the demo heatmap when Maps keys are absent. */
export const DEMO_WARDS = [
  { name: 'Anand Vihar', lat: 28.6469, lng: 77.316, aqi: 462 },
  { name: 'Punjabi Bagh', lat: 28.6683, lng: 77.1254, aqi: 441 },
  { name: 'RK Puram', lat: 28.5635, lng: 77.1762, aqi: 418 },
  { name: 'Mandir Marg', lat: 28.6364, lng: 77.1987, aqi: 405 },
  { name: 'Dwarka Sec-8', lat: 28.5708, lng: 77.0712, aqi: 392 },
  { name: 'Rohini', lat: 28.7325, lng: 77.1199, aqi: 430 },
  { name: 'Jahangirpuri', lat: 28.7259, lng: 77.1623, aqi: 455 },
  { name: 'Okhla Phase-2', lat: 28.5308, lng: 77.2713, aqi: 409 },
  { name: 'Narela', lat: 28.8228, lng: 77.1019, aqi: 388 },
  { name: 'Najafgarh', lat: 28.6092, lng: 76.9798, aqi: 356 },
  { name: 'Sonia Vihar', lat: 28.7105, lng: 77.2495, aqi: 421 },
  { name: 'ITO', lat: 28.6289, lng: 77.2405, aqi: 437 },
];

export const DEMO_REPORTS: CommunityReport[] = [
  {
    id: 'demo-1',
    location: { lat: 28.6469, lng: 77.316, label: 'Anand Vihar' },
    category: 'burning',
    description:
      'Garbage and leaf burning near the school gate since 6 AM. Thick smoke entering classrooms.',
    severity: 5,
    sentimentScore: -0.8,
    authorName: 'Meera S.',
    createdAt: '2026-11-23T06:40:00+05:30',
  },
  {
    id: 'demo-2',
    location: { lat: 28.6289, lng: 77.2405, label: 'ITO Crossing' },
    category: 'traffic',
    description:
      'Long idling queues at the signal; buses and trucks standing with engines on for 10+ minutes.',
    severity: 4,
    sentimentScore: -0.6,
    authorName: 'Arjun K.',
    createdAt: '2026-11-23T08:15:00+05:30',
  },
  {
    id: 'demo-3',
    location: { lat: 28.5635, lng: 77.1762, label: 'RK Puram' },
    category: 'construction',
    description:
      'Demolition work without dust screens or water sprinkling. Dust visible across the block.',
    severity: 3,
    sentimentScore: -0.4,
    authorName: 'Farhan A.',
    createdAt: '2026-11-22T17:20:00+05:30',
  },
  {
    id: 'demo-4',
    location: { lat: 28.7325, lng: 77.1199, label: 'Rohini' },
    category: 'other',
    description:
      'Residents started a weekend car-free street play hour. Kids played outside with masks, great initiative!',
    severity: 1,
    sentimentScore: 0.7,
    authorName: 'Divya R.',
    createdAt: '2026-11-22T10:05:00+05:30',
  },
];

const PERSONA_FOCUS: Record<Persona, string> = {
  family_kids: 'protecting children during school runs and play time',
  elderly: 'keeping elders with heart/lung conditions safe indoors',
  asthma: 'preventing respiratory flare-ups with strict exposure control',
  commuter: 'cutting exposure and emissions on the daily commute',
  outdoor_worker: 'reducing exposure for people who must work outside',
  school_admin: 'keeping a whole school safe with schedule and ventilation changes',
};

/** Schema-valid, persona-aware routine used in demo mode. */
export function buildDemoRoutine(req: RoutineRequest): DailyRoutine {
  const impact = computeSwapImpact('car-to-metro', Math.max(req.commuteKm, 1), 5);
  const dailySaving = Math.round((impact.weeklyCo2eKg / 5) * 100) / 100;

  return {
    title: `Smog-safe day for ${PERSONA_FOCUS[req.persona].split(' ')[0]} households`,
    summary: `AQI ${req.aqi} in ${req.city}. This routine keeps exposure low during the morning and evening inversion peaks while cutting ~${dailySaving} kg CO₂e per day.`,
    steps: [
      {
        time: '06:30',
        activity: 'Seal windows, run purifier on high; check VayuSense before opening anything',
        location: 'indoor',
        emissionSaving: 'Avoids ventilating with smog-laden air',
        healthNote: 'Indoor PM2.5 stays 60–80% lower than outdoors',
      },
      {
        time: '08:00',
        activity: 'Metro/bus instead of driving; N95 for the last-mile walk',
        location: 'transit',
        emissionSaving: `${dailySaving} kg CO₂e avoided today`,
        healthNote: 'Morning peak exposure cut by ~70% vs car windows open',
      },
      {
        time: '10:30',
        activity: 'Indoor movement break: yoga or corridor games instead of outdoor recess',
        location: 'indoor',
        emissionSaving: 'Zero-emission activity',
        healthNote: 'Keeps kids active without inhaling peak smog',
      },
      {
        time: '13:00',
        activity: 'Cook on induction with exhaust on; brief window check only if AQI dips',
        location: 'indoor',
        emissionSaving: '0.1 kg CO₂e per meal vs LPG',
        healthNote: 'Lower indoor NO₂ and particulates',
      },
      {
        time: '17:30',
        activity: 'Wet-mop floors, wipe surfaces; avoid vacuuming without HEPA',
        location: 'indoor',
        emissionSaving: 'No energy use',
        healthNote: 'Removes settled dust before it resuspends',
      },
      {
        time: '20:00',
        activity: 'Family indoor evening; compost kitchen waste instead of any burning',
        location: 'indoor',
        emissionSaving: '~1.7 kg CO₂e and 8 g PM2.5 per kg waste not burned',
        healthNote: 'Protects the whole neighbourhood overnight',
      },
    ],
    estimatedCo2eSavedKg: dailySaving,
  };
}

interface DemoReplyRule {
  keywords: string[];
  reply: string;
  actions: { label: string; prompt: string }[];
}

const DEMO_REPLY_RULES: DemoReplyRule[] = [
  {
    keywords: ['jog', 'run', 'exercise', 'workout', 'walk'],
    reply:
      'With AQI above 400, skip outdoor cardio entirely today — heavy breathing multiplies your inhaled dose 5–10×. Move the workout indoors (bodyweight circuit or yoga) with a purifier running. If you must step out, keep it under 10 minutes, wear a fitted N95, and avoid main roads where tailpipe PM2.5 concentrates.',
    actions: [
      {
        label: 'Indoor workout plan',
        prompt: 'Give me a 20-minute indoor workout plan for smog days.',
      },
      { label: 'When is it safer?', prompt: 'When does AQI usually dip during the day?' },
    ],
  },
  {
    keywords: ['mask', 'n95', ' respirator'],
    reply:
      'Use a NIOSH/IS-certified N95 (or FFP2) with a snug fit — cloth and surgical masks do almost nothing against PM2.5. Check the seal: inhale sharply; the mask should collapse slightly. For kids, use child-sized N95s and supervise fit. Replace after ~20 hours of use or when breathing resistance rises.',
    actions: [{ label: 'Mask fit checklist', prompt: 'How do I check my N95 fit at home?' }],
  },
  {
    keywords: ['school', 'kids', 'child', 'recess'],
    reply:
      'For schools in Severe AQI: move recess and PE indoors, keep windows sealed, run purifiers in classrooms (a DIY box-fan + MERV-13 filter works at ~1/10th the cost), stagger pickup to cut idling at the gate, and ask parents to switch off engines while waiting. Send the advisory home in the parent group — community coordination halves exposure.',
    actions: [
      { label: 'DIY purifier guide', prompt: 'How do I build a cheap classroom air purifier?' },
      {
        label: 'School advisory text',
        prompt: 'Draft a parent-group advisory for Severe AQI days.',
      },
    ],
  },
  {
    keywords: ['purifier', 'indoor', 'ventilat', 'window', 'hepa'],
    reply:
      'Indoor playbook for smog days: (1) seal windows and door gaps, (2) run a HEPA purifier sized to the room (CADR ≥ room volume × 3), (3) cook with the exhaust on and prefer induction, (4) wet-mop instead of dry sweeping, (5) ventilate only in the mid-afternoon dip if AQI falls below 200. A DIY Corsi-Rosenthal box (4 MERV-13 filters + box fan) delivers ~600 m³/h CADR for under ₹4,000.',
    actions: [
      { label: 'Size my purifier', prompt: 'How do I size a purifier for a 20 m² bedroom?' },
    ],
  },
  {
    keywords: ['commute', 'metro', 'traffic', 'drive', 'car'],
    reply:
      'Your commute is both an exposure and an emission problem. Switching a 12 km car commute to metro 5 days a week avoids ~8.4 kg CO₂e and 0.24 g of tailpipe PM2.5 weekly. Inside a car in traffic, PM2.5 can be 2–3× roadside levels — keep windows up, recirculation on. For last-mile, walk quieter streets, not the arterial road.',
    actions: [
      {
        label: 'Calculate my swap',
        prompt: 'What is the impact if I cycle 4 km instead of driving?',
      },
    ],
  },
];

/** Keyword-routed, deterministic assistant reply for demo mode. */
export function buildDemoChatReply(message: string, persona: Persona, aqi = 415): ChatResponse {
  const lower = message.toLowerCase();
  const rule = DEMO_REPLY_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  if (rule) {
    return { reply: rule.reply, suggestedActions: rule.actions };
  }
  return {
    reply: `Current demo conditions: AQI ${aqi} (Severe), dominant pollutant PM2.5. For your profile (${PERSONA_FOCUS[persona]}), the priority today is: stay indoors during 6–10 AM and 6–11 PM peaks, run purification, wear N95 for any unavoidable outing, and shift one car trip to metro or cycle. Ask me about masks, schools, indoor air, commutes or sustainable swaps for specifics.`,
    suggestedActions: [
      { label: 'Plan my day', prompt: 'Generate a low-emission routine for my household.' },
      { label: 'Indoor air hacks', prompt: 'What can I do to keep indoor air clean today?' },
    ],
  };
}
