/**
 * Standalone Cloud Run entry point.
 * Identical Express app as the Firebase deployment; listens on $PORT with
 * graceful shutdown for container orchestration.
 */
import { createApp } from './app';
import { config } from './config';
import { logInfo } from './lib/logger';

const app = createApp();
const server = app.listen(config.port, () => {
  logInfo('request.completed', {
    scope: 'startup',
    port: config.port,
    env: config.nodeEnv,
    demoMode: config.demo,
  });
});

function shutdown(signal: string): void {
  logInfo('request.completed', { scope: 'shutdown', signal });
  server.close(() => process.exit(0));
  // Force-exit if connections refuse to drain within the platform grace period.
  setTimeout(() => process.exit(1), 9_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
