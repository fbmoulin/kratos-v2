import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry() {
  if (!process.env.SENTRY_DSN || initialized) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });

  initialized = true;
}

export function captureError(err: Error, extra?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(err, extra ? { extra } : undefined);
}
