import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { fetchCurrent, fetchForecast } from '../services/airQuality';

export const airQualityRouter = Router();

const coordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  label: z.string().max(120).optional(),
});

/** GET /api/air-quality/current?lat=&lng= — Google Air Quality API + CPCB AQI. */
airQualityRouter.get(
  '/current',
  asyncHandler(async (req, res) => {
    const { lat, lng, label } = coordsSchema.parse(req.query);
    res.json(await fetchCurrent(lat, lng, label));
  }),
);

/** GET /api/air-quality/forecast?lat=&lng= — 24-hour outlook. */
airQualityRouter.get(
  '/forecast',
  asyncHandler(async (req, res) => {
    const { lat, lng } = coordsSchema.parse(req.query);
    res.json({ points: await fetchForecast(lat, lng) });
  }),
);
