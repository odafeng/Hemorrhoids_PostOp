// Production-grade error logging with Sentry + Supabase dual-write
// Sentry: real-time alerting, stack trace aggregation, performance
// Supabase: long-term storage, research audit trail

import * as Sentry from '@sentry/react';

const LOG_TABLE = 'client_error_logs';
let _sentryInitialized = false;

/**
 * Initialize Sentry (call once at app startup)
 */
export function initSentry() {
  if (_sentryInitialized) return;
  _sentryInitialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.info('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' or 'production'
    // Performance monitoring
    tracesSampleRate: 0.2, // 20% of transactions
    // Session replay for debugging
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0, // 100% on error
    // Filter out noisy errors
    beforeSend(event) {
      // Don't send errors from demo mode
      if (window.location.href.includes('demo')) return null;
      return event;
    },
  });
}

/**
 * Severity levels
 */
export const Severity = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Log a structured error — Sentry + Supabase + console
 */
export async function logError(error, context = {}) {
  const severity = context.severity || Severity.ERROR;
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // 1. Console (always)
  const consoleFn = severity === Severity.FATAL || severity === Severity.ERROR
    ? console.error : severity === Severity.WARNING ? console.warn : console.info;
  consoleFn(`[${severity.toUpperCase()}] ${context.type || 'error'}:`, error);

  // 2. Sentry (real-time alerting)
  try {
    if (_sentryInitialized) {
      Sentry.withScope((scope) => {
        scope.setLevel(severity);
        scope.setTag('error_type', context.type || 'unknown');
        if (context.component) scope.setTag('component', context.component);
        if (context.metadata) scope.setContext('metadata', context.metadata);
        Sentry.captureException(errorObj);
      });
    }
  } catch {
    // Sentry should never crash the app
  }

  // 3. Supabase (audit trail / long-term storage)
  try {
    const { default: supabase } = await import('./supabaseClient');
    if (!supabase) return;

    await supabase.from(LOG_TABLE).insert({
      error_message: errorObj.message,
      error_stack: errorObj.stack || null,
      context: JSON.stringify({
        type: context.type || 'unknown',
        severity,
        component: context.component || null,
        metadata: context.metadata || null,
      }),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch {
    // DB logging should never crash the app
  }
}

/**
 * Install global error handlers (idempotent)
 */
let _installed = false;
export function installGlobalErrorHandlers() {
  if (_installed) return;
  _installed = true;

  window.addEventListener('error', (event) => {
    logError(event.error || event.message, {
      type: 'unhandled_error',
      severity: Severity.FATAL,
      component: 'global',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, {
      type: 'unhandled_rejection',
      severity: Severity.ERROR,
      component: 'global',
    });
  });
}
