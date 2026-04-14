// Client-side Sentry initialization.
// Runs in the browser for every page load.
import * as Sentry from "@sentry/nextjs";

const DSN = "https://f18866cb3fe9d1a612442e298b21cdbe@o4511196791439360.ingest.us.sentry.io/4511196801859584";

Sentry.init({
  dsn: DSN,

  // Trace 10% of requests for performance monitoring.
  tracesSampleRate: 0.1,

  // Suppress noisy third-party errors.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^ChunkLoadError/,
    /^Loading chunk/,
  ],
});
