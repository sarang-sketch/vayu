import { Router } from 'express';
import { computeSwapImpact, SWAPS, swapImpactRequestSchema } from '@vayusense/shared';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest } from '../lib/errors';

export const swapsRouter = Router();

/** GET /api/swaps — the sustainable-swap catalog with emission factors. */
swapsRouter.get('/', (_req, res) => {
  res.json({ swaps: SWAPS });
});

/** POST /api/swaps/impact — quantified CO₂e + PM2.5 impact of a swap. */
swapsRouter.post(
  '/impact',
  asyncHandler(async (req, res) => {
    const input = swapImpactRequestSchema.parse(req.body);
    try {
      res.json(computeSwapImpact(input.swapId, input.quantityPerDay, input.daysPerWeek));
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : 'Invalid swap');
    }
  }),
);
