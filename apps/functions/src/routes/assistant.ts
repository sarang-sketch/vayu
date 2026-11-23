import { Router } from 'express';
import { chatRequestSchema } from '@vayusense/shared';
import { asyncHandler } from '../lib/asyncHandler';
import { chat } from '../services/gemini';

export const assistantRouter = Router();

/** POST /api/assistant/chat — Gemini-powered, persona-aware assistant. */
assistantRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const input = chatRequestSchema.parse(req.body);
    const result = await chat(input);
    res.json({ ...result.data, meta: result.meta });
  }),
);
