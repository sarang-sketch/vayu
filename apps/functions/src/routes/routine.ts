import { Router } from 'express';
import { routineRequestSchema } from '@vayusense/shared';
import { asyncHandler } from '../lib/asyncHandler';
import { logError } from '../lib/logger';
import { generateRoutine } from '../services/gemini';
import { saveRoutine } from '../services/firestore';

export const routineRouter = Router();

/** POST /api/routine/generate — personalized low-emission daily routine. */
routineRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const input = routineRequestSchema.parse(req.body);
    const result = await generateRoutine(input);

    // Persist for signed-in households; never block the response on storage.
    if (req.uid) {
      saveRoutine(req.uid, result.data).catch((error) =>
        logError('service.error', error, { scope: 'saveRoutine' }),
      );
    }

    res.json({ ...result.data, meta: result.meta });
  }),
);
