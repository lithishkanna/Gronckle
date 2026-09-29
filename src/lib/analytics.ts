/**
 * Analytics & Error Tracking module.
 * Integrates PostHog (privacy-friendly analytics) and Sentry (error tracking)
 * via direct lightweight HTTP ingest — zero heavy SDK bundle bloat, zero dependencies,
 * fully respecting Do Not Track headers.
 */

// ─── PostHog Analytics ─────────────────────────────────────────────

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

const STORAGE_DISTINCT_ID_KEY = 'gronckle_distinct_id';

function getOrCreateDistinctId(): string {
  try {
    let id = localStorage.getItem(STORAGE_DISTINCT_ID_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(STORAGE_DISTINCT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon_user';
  }
}

let distinctId = getOrCreateDistinctId();

async function sendPostHogEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!POSTHOG_KEY) return;
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
    return;
  }

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        properties: {
          ...properties,
          distinct_id: distinctId,
          $lib: 'gronckle-web-client',
          $current_url: window.location.href,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Fail silently in background
  }
}

export async function initAnalytics(): Promise<void> {
  if (POSTHOG_KEY) {
    trackEvent('$app_init', { referrer: document.referrer });
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  sendPostHogEvent(event, properties);
}

export function trackPageView(page: string): void {
  sendPostHogEvent('$pageview', { page });
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  distinctId = userId;
  try {
    localStorage.setItem(STORAGE_DISTINCT_ID_KEY, userId);
  } catch {
    // ignore
  }
  sendPostHogEvent('$identify', { ...properties, distinct_id: userId });
}

export function resetAnalytics(): void {
  try {
    localStorage.removeItem(STORAGE_DISTINCT_ID_KEY);
  } catch {
    // ignore
  }
  distinctId = getOrCreateDistinctId();
}

// ─── Sentry Error Tracking ─────────────────────────────────────────

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
let currentUser: { id: string; email?: string; username?: string } | null = null;

async function sendSentryEvent(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;

  try {
    // Match: https://<key>@<host>/<projectId>
    const dsnMatch = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!dsnMatch) return;

    const [, key, host, projectId] = dsnMatch;
    const endpoint = `https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${key}&sentry_client=gronckle/1.0`;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        platform: 'javascript',
        level: 'error',
        logger: 'javascript',
        environment: import.meta.env.MODE || 'production',
        message,
        exception: {
          values: [
            {
              type: error instanceof Error ? error.name : 'Error',
              value: message,
              stacktrace: stack ? { frames: [{ filename: 'app.js', lineno: 1 }] } : undefined,
            },
          ],
        },
        user: currentUser || undefined,
        extra: context,
      }),
    });
  } catch {
    // Fail silently in background
  }
}

export async function initErrorTracking(): Promise<void> {
  if (!SENTRY_DSN) return;

  // Global uncaught error listener
  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, { filename: event.filename, lineno: event.lineno });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, { type: 'unhandledrejection' });
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[Gronckle Error]', error, context);
  sendSentryEvent(error, context);
}

export function setErrorUser(user: { id: string; email?: string; username?: string } | null): void {
  currentUser = user;
}

// ─── Combined Initialization ───────────────────────────────────────

export async function initTelemetry(): Promise<void> {
  await Promise.all([
    initAnalytics(),
    initErrorTracking(),
  ]);
}
