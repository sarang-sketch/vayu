/**
 * reCAPTCHA Enterprise assessment for civic-report submissions.
 * Blocks bot spam before it reaches Firestore or the Natural Language API.
 *
 * Security posture: when reCAPTCHA is configured, assessment FAILS CLOSED —
 * missing tokens, missing API credentials or upstream errors all reject the
 * write. Only the unconfigured demo mode passes without assessment.
 */
import { z } from 'zod';
import { config } from '../config';
import { logError, logWarn } from '../lib/logger';

const assessmentSchema = z.object({
  tokenProperties: z
    .object({ valid: z.boolean().optional(), action: z.string().optional() })
    .optional(),
  riskAnalysis: z.object({ score: z.number().optional() }).optional(),
});

export interface AssessmentResult {
  valid: boolean;
  score: number;
  source: 'recaptcha_enterprise' | 'demo';
}

const MIN_SCORE = 0.5;

export async function assessCommunityToken(token?: string): Promise<AssessmentResult> {
  if (config.demo.recaptcha) {
    return { valid: true, score: 0.9, source: 'demo' };
  }
  if (!token) return { valid: false, score: 0, source: 'recaptcha_enterprise' };
  if (!config.recaptchaApiKey) {
    logError('recaptcha.rejected', new Error('RECAPTCHA_ENTERPRISE_API_KEY not configured'), {
      failClosed: true,
    });
    return { valid: false, score: 0, source: 'recaptcha_enterprise' };
  }

  try {
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${config.recaptchaProjectId}/assessments?key=${config.recaptchaApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            token,
            siteKey: config.recaptchaSiteKey,
            expectedAction: 'community_report',
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = assessmentSchema.parse(await response.json());
    const score = data.riskAnalysis?.score ?? 0;
    const valid = Boolean(data.tokenProperties?.valid) && score >= MIN_SCORE;
    if (!valid) logWarn('recaptcha.rejected', { score });
    return { valid, score, source: 'recaptcha_enterprise' };
  } catch (error) {
    // Fail closed: an unreachable assessor must not open the gate to bots.
    logError('recaptcha.rejected', error, { failClosed: true });
    return { valid: false, score: 0, source: 'recaptcha_enterprise' };
  }
}
