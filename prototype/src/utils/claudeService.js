// Claude AI Service — calls Supabase Edge Function only
// In production: API failure shows error, no mock fallback (medical safety)
// In demo mode: uses mockAI directly

import { getAIResponse as getMockResponse } from './mockAI';
import { logError } from './errorLogger';

const isProduction = !!import.meta.env.VITE_SUPABASE_URL;

function getAIChatUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    // No Supabase URL = demo/dev mode, there's no AI endpoint
    return null;
  }
  return `${supabaseUrl}/functions/v1/ai-chat`;
}

async function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    headers['apikey'] = anonKey; // Required for Supabase routing

    // Send user JWT — no anon fallback in production
    const { default: supabase } = await import('./supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Get AI response from Claude API via Supabase Edge Function
 * @param {string} question - User's question
 * @param {object} [options] - Optional settings
 * @param {object} [options.recentSymptoms] - Recent symptom summary for context
 * @param {Array}  [options.conversationHistory] - Previous messages for context
 * @param {boolean} [options.isDemo] - Whether in demo mode
 * @returns {Promise<{text: string, source: 'claude'|'mock'|'error'}>}
 */
export async function getClaudeResponse(question, options = {}) {
  const { recentSymptoms = null, conversationHistory = [], isDemo = false } = options;

  // Demo mode: always use mock
  if (isDemo || !getAIChatUrl()) {
    return { text: getMockResponse(question), source: 'mock' };
  }

  try {
    const body = { question };
    if (recentSymptoms) {
      body.recentSymptoms = recentSymptoms;
    }
    if (conversationHistory.length > 0) {
      body.history = conversationHistory.slice(-20);
    }

    const res = await fetch(getAIChatUrl(), {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logError(new Error(`Claude API ${res.status}: ${err.error}`), { type: 'ai_api_error' });

      // Production: no mock fallback — show honest error
      return {
        text: 'AI 衛教暫時不可用，請稍後再試。如有緊急狀況，請聯絡您的醫療團隊。',
        source: 'error',
      };
    }

    const data = await res.json();
    return { text: data.response, source: 'claude' };
  } catch (err) {
    console.error('Claude service error:', err);
    logError(err, { type: 'ai_network_error' });

    // Production: no mock fallback
    return {
      text: 'AI 衛教暫時不可用，請稍後再試。如有緊急狀況，請聯絡您的醫療團隊。',
      source: 'error',
    };
  }
}
