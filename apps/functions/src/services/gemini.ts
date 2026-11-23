/**
 * Gemini service (Google GenAI SDK).
 *
 * Two call paths:
 *  1. AI Studio  — `new GoogleGenAI({ apiKey })`
 *  2. Vertex AI  — `new GoogleGenAI({ vertexai: true, project, location })`
 *
 * All model output is requested as JSON (responseMimeType + responseSchema)
 * and then validated with the shared Zod contracts. One automatic repair
 * retry guards against occasional schema drift. Without an API key the
 * service serves the deterministic demo scenario instead.
 */
import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type } from '@google/genai';
import {
  chatResponseSchema,
  dailyRoutineSchema,
  type ChatRequest,
  type ChatResponse,
  type DailyRoutine,
  type RoutineRequest,
} from '@vayusense/shared';
import type { ZodType } from 'zod';
import { config } from '../config';
import { buildDemoChatReply, buildDemoRoutine } from '../demo/scenario';
import { upstreamError } from '../lib/errors';
import { logInfo, logWarn } from '../lib/logger';
import { buildChatSystemPrompt, buildRoutineSystemPrompt, buildRoutineUserPrompt } from './prompts';

export interface AiResult<T> {
  data: T;
  meta: { model: string; demo: boolean };
}

const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = config.useVertexAi
      ? new GoogleGenAI({
          vertexai: true,
          project: config.projectId,
          location: config.vertexLocation,
        })
      : new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return client;
}

/** JSON schema for structured routine output (Gemini responseSchema). */
const ROUTINE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING },
          activity: { type: Type.STRING },
          location: { type: Type.STRING, enum: ['indoor', 'outdoor', 'transit'] },
          emissionSaving: { type: Type.STRING },
          healthNote: { type: Type.STRING },
        },
        required: ['time', 'activity', 'location', 'emissionSaving', 'healthNote'],
      },
    },
    estimatedCo2eSavedKg: { type: Type.NUMBER },
  },
  required: ['title', 'summary', 'steps', 'estimatedCo2eSavedKg'],
};

const CHAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    suggestedActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { label: { type: Type.STRING }, prompt: { type: Type.STRING } },
        required: ['label', 'prompt'],
      },
    },
  },
  required: ['reply'],
};

/** Call Gemini, parse JSON, validate with Zod; retry once with a repair turn. */
async function generateStructured<T>(
  systemInstruction: string,
  userPrompt: string,
  responseSchema: object,
  contract: ZodType<T>,
  history: { role: 'user' | 'model'; text: string }[] = [],
): Promise<T> {
  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user' as const, parts: [{ text: userPrompt }] },
  ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await getClient().models.generateContent({
      model: config.geminiModel,
      contents,
      config: {
        systemInstruction,
        temperature: attempt === 0 ? 0.7 : 0.2,
        responseMimeType: 'application/json',
        responseSchema,
        safetySettings: SAFETY_SETTINGS,
      },
    });

    const text = response.text ?? '';
    try {
      return contract.parse(JSON.parse(text));
    } catch (error) {
      logWarn('service.demo_fallback', { reason: 'schema_drift', attempt });
      if (attempt === 1) {
        throw upstreamError('gemini', `Output failed contract validation: ${String(error)}`);
      }
      contents.push(
        { role: 'model', parts: [{ text }] },
        {
          role: 'user',
          parts: [
            {
              text: 'Your previous JSON did not match the required schema. Return ONLY corrected JSON.',
            },
          ],
        },
      );
    }
  }
  throw upstreamError('gemini', 'Unreachable');
}

/** Assistant chat turn. */
export async function chat(req: ChatRequest): Promise<AiResult<ChatResponse>> {
  if (config.demo.ai) {
    logInfo('service.demo_fallback', { service: 'gemini', endpoint: 'chat' });
    return {
      data: buildDemoChatReply(req.message, req.persona, req.aqi),
      meta: { model: 'demo-scenario', demo: true },
    };
  }
  const data = await generateStructured(
    buildChatSystemPrompt(req),
    req.message,
    CHAT_RESPONSE_SCHEMA,
    chatResponseSchema,
    req.history,
  );
  logInfo('assistant.chat', { persona: req.persona, model: config.geminiModel });
  return { data, meta: { model: config.geminiModel, demo: false } };
}

/** Personalized low-emission daily routine. */
export async function generateRoutine(req: RoutineRequest): Promise<AiResult<DailyRoutine>> {
  if (config.demo.ai) {
    logInfo('service.demo_fallback', { service: 'gemini', endpoint: 'routine' });
    return { data: buildDemoRoutine(req), meta: { model: 'demo-scenario', demo: true } };
  }
  const data = await generateStructured(
    buildRoutineSystemPrompt(),
    buildRoutineUserPrompt(req),
    ROUTINE_RESPONSE_SCHEMA,
    dailyRoutineSchema,
  );
  logInfo('routine.generated', { persona: req.persona, city: req.city, model: config.geminiModel });
  return { data, meta: { model: config.geminiModel, demo: false } };
}
