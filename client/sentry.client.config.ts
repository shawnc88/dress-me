import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Filter out noise from iOS Safari media/WebSocket APIs that reject
    // promises with raw DOM Event objects (not real Errors). These surface
    // in Sentry as "Event `Event` (type=error) captured as promise rejection"
    // and are almost always recoverable media permission/autoplay/reconnect
    // issues already handled inline.
    ignoreErrors: [
      'Event `Event` (type=error) captured as promise rejection',
      'Non-Error promise rejection captured',
      /^Event `.+` \(type=.+\) captured as promise rejection$/,
      'The request is not allowed by the user agent',
      'The play() request was interrupted',
      'The operation was aborted',
      'Connection closed: 1000',
      'Client initiated disconnect',
    ],

    beforeSend(event, hint) {
      const err = hint?.originalException as any;
      if (err && typeof err === 'object' && typeof Event !== 'undefined' && err instanceof Event) {
        return null;
      }
      return event;
    },
  });
}
