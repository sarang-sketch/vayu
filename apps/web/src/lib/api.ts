/**
 * Typed API client for the VayuSense backend.
 * Attaches Firebase ID tokens when signed in, surfaces structured error
 * envelopes, and logs failures to GA4 for funnel diagnostics.
 */
import type {
  AirQualitySnapshot,
  ChatRequest,
  ChatResponse,
  CommunityReport,
  CommunityReportInput,
  DailyRoutine,
  ForecastPoint,
  RoutineRequest,
  SwapDefinition,
  SwapImpact,
} from '@vayusense/shared';
import { getToken } from 'firebase/app-check';
import { appCheck, auth } from '../config/firebase';
import { env } from '../config/env';
import { track } from './analytics';

export interface ApiMeta {
  model: string;
  demo: boolean;
}

export interface HealthReport {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  services: Record<string, string>;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const BASE = env.VITE_API_BASE_URL.replace(/\/$/, '');

async function authHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  // App Check attestation — required when server enforcement is enabled.
  if (appCheck) {
    try {
      const { token } = await getToken(appCheck);
      headers['X-Firebase-AppCheck'] = token;
    } catch {
      // Attestation unavailable; server decides whether to reject.
    }
  }

  const user = auth?.currentUser;
  if (user) {
    try {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    } catch {
      // Token refresh failed — proceed anonymously.
    }
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    let code = 'HTTP_ERROR';
    let message = `Request failed (${response.status})`;
    let requestId: string | undefined;
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string; requestId?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      requestId = body.error?.requestId;
    } catch {
      // non-JSON error body — keep defaults
    }
    track('api_error', { path, status: response.status, code });
    throw new ApiClientError(response.status, code, message, requestId);
  }
  return (await response.json()) as T;
}

const qs = (params: Record<string, string | number>): string =>
  new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();

export const api = {
  health: () => request<HealthReport>('/api/health'),

  currentAirQuality: (lat: number, lng: number, label?: string) =>
    request<AirQualitySnapshot>(
      `/api/air-quality/current?${qs({ lat, lng, ...(label ? { label } : {}) })}`,
    ),

  forecast: (lat: number, lng: number) =>
    request<{ points: ForecastPoint[] }>(`/api/air-quality/forecast?${qs({ lat, lng })}`),

  chat: (input: ChatRequest) =>
    request<ChatResponse & { meta: ApiMeta }>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  generateRoutine: (input: RoutineRequest) =>
    request<DailyRoutine & { meta: ApiMeta }>('/api/routine/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  swaps: () => request<{ swaps: SwapDefinition[] }>('/api/swaps'),

  swapImpact: (swapId: string, quantityPerDay: number, daysPerWeek: number) =>
    request<SwapImpact>('/api/swaps/impact', {
      method: 'POST',
      body: JSON.stringify({ swapId, quantityPerDay, daysPerWeek }),
    }),

  reports: () => request<{ reports: CommunityReport[] }>('/api/community/reports'),

  submitReport: (input: CommunityReportInput) =>
    request<{ report: CommunityReport; sentimentSource: string }>('/api/community/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  translate: (text: string, target: string) =>
    request<{ translatedText: string; source: string }>('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ text, target }),
    }),
};
