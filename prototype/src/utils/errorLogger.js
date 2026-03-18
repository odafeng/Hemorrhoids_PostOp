// Client-side error logging utility
// Captures unhandled errors and sends to Supabase for monitoring

import supabase from './supabaseClient';

const LOG_TABLE = 'client_error_logs';

/**
 * Log a client-side error to Supabase (best-effort, never throws)
 */
export async function logError(error, context = {}) {
  try {
    const entry = {
      error_message: error?.message || String(error),
      error_stack: error?.stack || null,
      context: JSON.stringify(context),
      user_agent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Try Supabase first
    const { error: dbError } = await supabase
      .from(LOG_TABLE)
      .insert(entry);

    if (dbError) {
      // Table may not exist yet — fall back to console only
      console.warn('[logError] DB insert failed:', dbError.message);
    }
  } catch {
    // Logging should never crash the app
  }
}

/**
 * Install global error handlers for unhandled errors and promise rejections
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, { type: 'unhandled_error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'unhandled_rejection' });
  });
}
