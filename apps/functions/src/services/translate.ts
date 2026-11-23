/**
 * Google Cloud Translation for multilingual health advisories.
 * Demo mode ships pre-translated Hindi advisories; unsupported targets pass
 * through unchanged so the UI never breaks.
 */
import { z } from 'zod';
import { config } from '../config';
import { logWarn } from '../lib/logger';

const HI_ADVISORIES: Record<string, string> = {
  'Health emergency: serious risk for everyone. Avoid all outdoor exposure, seal windows, run purifiers, follow official advisories.':
    'स्वास्थ्य आपातकाल: सभी के लिए गंभीर जोखिम। बाहर जाने से बचें, खिड़कियां बंद रखें, एयर प्यूरीफायर चलाएं और आधिकारिक सलाह का पालन करें।',
  'Respiratory illness on prolonged exposure. Keep kids and elders indoors, run purification, N95 mandatory outside.':
    'लंबे समय तक संपर्क से श्वसन रोग का खतरा। बच्चों और बुजुर्गों को घर के अंदर रखें, प्यूरीफायर चलाएं, बाहर N95 अनिवार्य।',
  'Breathing discomfort for most people on prolonged exposure. Prefer indoor activities; use N95 outdoors.':
    'अधिकांश लोगों को सांस लेने में तकलीफ हो सकती है। घर के अंदर गतिविधियां करें; बाहर N95 पहनें।',
};

const translateResponseSchema = z.object({
  data: z.object({ translations: z.array(z.object({ translatedText: z.string() })) }).optional(),
});

export interface TranslationResult {
  translatedText: string;
  source: 'google_cloud_translation' | 'demo_dictionary' | 'passthrough';
}

export async function translateText(text: string, target: string): Promise<TranslationResult> {
  if (target === 'en') return { translatedText: text, source: 'passthrough' };

  if (config.demo.translate) {
    const hit = target === 'hi' ? HI_ADVISORIES[text] : undefined;
    return hit
      ? { translatedText: hit, source: 'demo_dictionary' }
      : { translatedText: text, source: 'passthrough' };
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${config.translateApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target, format: 'text' }),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = translateResponseSchema.parse(await response.json());
    const translated = data.data?.translations[0]?.translatedText;
    return translated
      ? { translatedText: translated, source: 'google_cloud_translation' }
      : { translatedText: text, source: 'passthrough' };
  } catch (error) {
    logWarn('service.demo_fallback', { service: 'cloud_translation', reason: String(error) });
    return { translatedText: text, source: 'passthrough' };
  }
}
