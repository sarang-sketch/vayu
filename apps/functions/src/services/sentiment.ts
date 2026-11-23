/**
 * Sentiment analysis for community reports.
 * Production: Google Cloud Natural Language API (documentSentiment.score).
 * Demo/fallback: a deterministic lexicon scorer so moderation triage still
 * works offline. Scores are in [-1, 1].
 */
import { z } from 'zod';
import { config } from '../config';
import { logInfo, logWarn } from '../lib/logger';

const NEGATIVE_WORDS = [
  'smoke',
  'burning',
  'terrible',
  'choking',
  'awful',
  'dangerous',
  'angry',
  'worst',
  'sick',
  'polluted',
  'hazard',
  'suffocating',
  'bad',
  'severe',
  'toxic',
  'illegal',
];
const POSITIVE_WORDS = [
  'great',
  'good',
  'clean',
  'happy',
  'thanks',
  'initiative',
  'better',
  'improved',
  'love',
  'excellent',
  'hope',
  'proud',
  'community',
  'success',
];

/** Deterministic lexicon sentiment in [-1, 1]. */
export function lexiconSentiment(text: string): number {
  const words = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  const neg = words.filter((w) => NEGATIVE_WORDS.includes(w)).length;
  const pos = words.filter((w) => POSITIVE_WORDS.includes(w)).length;
  const score = (pos - neg) / (pos + neg + 2);
  return Math.round(score * 100) / 100;
}

const nlResponseSchema = z.object({
  documentSentiment: z.object({ score: z.number(), magnitude: z.number().optional() }).optional(),
});

export interface SentimentResult {
  score: number;
  source: 'google_natural_language' | 'lexicon';
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  if (config.demo.sentiment) {
    return { score: lexiconSentiment(text), source: 'lexicon' };
  }
  try {
    const response = await fetch(
      `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${config.nlApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: { type: 'PLAIN_TEXT', content: text },
          encodingType: 'UTF8',
        }),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = nlResponseSchema.parse(await response.json());
    const score = data.documentSentiment?.score ?? lexiconSentiment(text);
    logInfo('community.report_created', { sentimentSource: 'google_natural_language', score });
    return { score, source: 'google_natural_language' };
  } catch (error) {
    logWarn('service.demo_fallback', { service: 'natural_language', reason: String(error) });
    return { score: lexiconSentiment(text), source: 'lexicon' };
  }
}
