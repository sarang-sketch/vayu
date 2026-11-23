/**
 * Structured logging → Google Cloud Logging.
 * Every log carries an event name and machine-readable payload so dashboards
 * and alerting policies can be built without parsing free text.
 */
import { logger } from 'firebase-functions';

export type LogEvent =
  | 'request.completed'
  | 'assistant.chat'
  | 'routine.generated'
  | 'airquality.fetched'
  | 'airquality.cache_hit'
  | 'community.report_created'
  | 'recaptcha.rejected'
  | 'appcheck.rejected'
  | 'smog.alert_sent'
  | 'service.demo_fallback'
  | 'service.error';

export function logInfo(event: LogEvent, payload: Record<string, unknown> = {}): void {
  logger.info(event, { event, ...payload });
}

export function logWarn(event: LogEvent, payload: Record<string, unknown> = {}): void {
  logger.warn(event, { event, ...payload });
}

export function logError(
  event: LogEvent,
  error: unknown,
  payload: Record<string, unknown> = {},
): void {
  logger.error(event, {
    event,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...payload,
  });
}
