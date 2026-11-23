import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { translateText } from '../services/translate';

export const translateRouter = Router();

const translateRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  target: z.enum(['hi', 'en', 'pa', 'ta', 'bn']),
});

/** POST /api/translate — multilingual health advisories (Cloud Translation). */
translateRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text, target } = translateRequestSchema.parse(req.body);
    res.json(await translateText(text, target));
  }),
);
