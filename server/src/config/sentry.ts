import * as Sentry from '@sentry/node';
import { env } from './env';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
  });

  initialized = true;
}

export function isSentryEnabled() {
  return initialized;
}

export { Sentry };
