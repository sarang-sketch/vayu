import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { communityReportSchema, type CommunityReport } from '@vayusense/shared';
import { config } from '../config';
import { DEMO_REPORTS } from '../demo/scenario';
import { asyncHandler } from '../lib/asyncHandler';
import { forbidden } from '../lib/errors';
import { logInfo } from '../lib/logger';
import { requireAuth } from '../middleware/security';
import { listReports, saveReport } from '../services/firestore';
import { assessCommunityToken } from '../services/recaptcha';
import { analyzeSentiment } from '../services/sentiment';

export const communityRouter = Router();

/** GET /api/community/reports — public civic feed. */
communityRouter.get(
  '/reports',
  asyncHandler(async (_req, res) => {
    const reports = config.firestoreEnabled ? await listReports() : [];
    res.json({ reports: reports.length > 0 ? reports : DEMO_REPORTS });
  }),
);

/** POST /api/community/reports — auth + reCAPTCHA + sentiment triage. */
communityRouter.post(
  '/reports',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = communityReportSchema.parse(req.body);

    const assessment = await assessCommunityToken(input.recaptchaToken);
    if (!assessment.valid) throw forbidden('reCAPTCHA assessment failed');

    const sentiment = await analyzeSentiment(input.description);
    const report: CommunityReport = {
      id: randomUUID(),
      location: input.location,
      category: input.category,
      description: input.description,
      severity: input.severity as CommunityReport['severity'],
      sentimentScore: sentiment.score,
      authorName: req.uid ? `Resident ${req.uid.slice(0, 6)}` : 'Community member',
      createdAt: new Date().toISOString(),
    };

    await saveReport(report, req.uid);
    logInfo('community.report_created', {
      id: report.id,
      category: report.category,
      severity: report.severity,
      sentiment: sentiment.score,
    });
    res
      .status(201)
      .json({ report, sentimentSource: sentiment.source, recaptcha: assessment.source });
  }),
);
