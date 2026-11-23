/**
 * End-to-end API smoke test.
 * Usage: start the API (`npm run dev:api`), then `npm run smoke`.
 * Exercises every route group, validation rejection and the error envelope.
 */
const BASE = process.env.API_BASE_URL ?? 'http://localhost:8080';

const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function get(path) {
  const response = await fetch(`${BASE}${path}`);
  assert(response.ok, `HTTP ${response.status}`);
  return response.json();
}

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert(response.ok, `HTTP ${response.status}`);
  return response.json();
}

await check('GET /api/health', async () => {
  const data = await get('/api/health');
  assert(data.status === 'ok', 'status not ok');
  assert(data.services.gemini, 'service modes missing');
});

await check('GET /api/air-quality/current (CPCB Severe)', async () => {
  const data = await get('/api/air-quality/current?lat=28.6139&lng=77.209&label=Delhi');
  assert(data.aqi > 400, `expected Severe AQI, got ${data.aqi}`);
  assert(data.category === 'severe', 'category mismatch');
  assert(data.dominant === 'pm25', 'dominant pollutant mismatch');
  assert(data.pollutants.length === 7, 'expected 7 pollutants');
});

await check('GET /api/air-quality/forecast (24 h)', async () => {
  const data = await get('/api/air-quality/forecast?lat=28.6139&lng=77.209');
  assert(data.points.length === 24, `expected 24 points, got ${data.points.length}`);
});

await check('POST /api/assistant/chat', async () => {
  const data = await post('/api/assistant/chat', {
    message: 'Is it safe to jog outside today?',
    persona: 'commuter',
    aqi: 415,
    city: 'New Delhi',
  });
  assert(data.reply.length > 50, 'reply too short');
  assert(/indoor/i.test(data.reply), 'expected exposure advice');
  assert(typeof data.meta.demo === 'boolean', 'meta missing');
});

await check('POST /api/routine/generate (structured output)', async () => {
  const data = await post('/api/routine/generate', {
    persona: 'family_kids',
    city: 'New Delhi',
    aqi: 415,
    householdSize: 4,
    commuteKm: 12,
  });
  assert(data.steps.length >= 4, 'too few steps');
  assert(/^\d{2}:\d{2}$/.test(data.steps[0].time), 'bad time format');
  assert(data.estimatedCo2eSavedKg > 0, 'no quantified saving');
});

await check('POST /api/swaps/impact (8.4 kg CO2e)', async () => {
  const data = await post('/api/swaps/impact', {
    swapId: 'car-to-metro',
    quantityPerDay: 12,
    daysPerWeek: 5,
  });
  assert(Math.abs(data.weeklyCo2eKg - 8.4) < 0.01, `got ${data.weeklyCo2eKg}`);
  assert(data.treesEquivalent > 0, 'trees equivalent missing');
});

await check('POST /api/swaps/impact rejects invalid input (400)', async () => {
  const response = await fetch(`${BASE}/api/swaps/impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ swapId: 'car-to-metro', quantityPerDay: -5, daysPerWeek: 5 }),
  });
  assert(response.status === 400, `expected 400, got ${response.status}`);
  const data = await response.json();
  assert(data.error.code === 'VALIDATION_ERROR', 'error code mismatch');
});

await check('GET /api/community/reports', async () => {
  const data = await get('/api/community/reports');
  assert(data.reports.length >= 4, 'feed too short');
});

await check('POST /api/community/reports (sentiment triage)', async () => {
  const data = await post('/api/community/reports', {
    location: { lat: 28.61, lng: 77.2, label: 'Smoke test location' },
    category: 'burning',
    description: 'Terrible smoke from burning waste near the park, choking.',
    severity: 4,
  });
  assert(data.report.sentimentScore < 0, 'expected negative sentiment');
  assert(data.report.id, 'report id missing');
});

await check('POST /api/translate (Hindi advisory)', async () => {
  const data = await post('/api/translate', {
    text: 'Health emergency: serious risk for everyone. Avoid all outdoor exposure, seal windows, run purifiers, follow official advisories.',
    target: 'hi',
  });
  assert(data.translatedText.includes('स्वास्थ्य'), 'expected Hindi translation');
});

await check('Unknown route returns structured 404', async () => {
  const response = await fetch(`${BASE}/api/does-not-exist`);
  assert(response.status === 404, `expected 404, got ${response.status}`);
  const data = await response.json();
  assert(data.error.code === 'NOT_FOUND', 'error code mismatch');
  assert(data.error.requestId, 'requestId missing');
});

let failed = 0;
for (const result of results) {
  if (result.ok) {
    process.stdout.write(`  PASS  ${result.name}\n`);
  } else {
    failed += 1;
    process.stdout.write(`  FAIL  ${result.name} — ${result.detail}\n`);
  }
}
process.stdout.write(`\n${results.length - failed}/${results.length} smoke checks passed\n`);
process.exit(failed > 0 ? 1 : 0);
