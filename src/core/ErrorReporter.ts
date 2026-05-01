// Minimum-viable global error reporter.
// - Catches uncaught `error` events and unhandled promise rejections.
// - Always logs a structured payload to the console (so prod errors are debuggable from devtools).
// - Optionally POSTs to a remote endpoint set at build time via VITE_ERROR_ENDPOINT.
// - Rate-limited to avoid runaway error loops flooding the network/console.

interface ErrorPayload {
  type: 'error' | 'unhandledrejection';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  url: string;
  userAgent: string;
  timestamp: string;
}

const MAX_REPORTS = 20;
let reportCount = 0;

function buildPayload(
  type: ErrorPayload['type'],
  err: unknown,
  extra?: Pick<ErrorPayload, 'source' | 'line' | 'column'>,
): ErrorPayload {
  const e = err as Error | undefined;
  return {
    type,
    message: e?.message ?? String(err),
    stack: e?.stack,
    source: extra?.source,
    line: extra?.line,
    column: extra?.column,
    url: location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

function send(payload: ErrorPayload): void {
  console.error('[error-reporter]', payload);

  const endpoint = import.meta.env.VITE_ERROR_ENDPOINT;
  if (!endpoint || !import.meta.env.PROD) return;

  // Use sendBeacon when available so reports survive page unload.
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, { method: 'POST', body, keepalive: true }).catch(() => {});
  }
}

function report(
  type: ErrorPayload['type'],
  err: unknown,
  extra?: Pick<ErrorPayload, 'source' | 'line' | 'column'>,
): void {
  if (reportCount >= MAX_REPORTS) return;
  reportCount += 1;
  try {
    send(buildPayload(type, err, extra));
  } catch {
    // Never let the reporter itself throw.
  }
}

export function installErrorReporter(): void {
  window.addEventListener('error', (event) => {
    report('error', event.error ?? event.message, {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    report('unhandledrejection', event.reason);
  });
}

export function reportManual(err: unknown): void {
  report('error', err);
}
