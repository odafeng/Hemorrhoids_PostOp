// Claude AI Service — calls Edge Function or local proxy
// Falls back to mockAI if the service is unavailable
// Returns { text, source } to inform UI about which AI is responding

import { getAIResponse as getMockResponse } from './mockAI';

function getAIChatUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/ai-chat`;
  }
  return '/api/ai-chat';
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }
  return headers;
}

/**
 * Get AI response from Claude API via Edge Function or local proxy
 * @param {string} question - User's question
 * @param {object} [options] - Optional settings
 * @param {object} [options.recentSymptoms] - Recent symptom summary for context
 * @param {Array}  [options.conversationHistory] - Previous messages for context
 * @returns {Promise<{text: string, source: 'claude'|'mock'}>} AI response with source indicator
 */
export async function getClaudeResponse(question, options = {}) {
  const { recentSymptoms = null, conversationHistory = [] } = options;

  try {
    const body = { question };
    if (recentSymptoms) {
      body.recentSymptoms = recentSymptoms;
    }
    if (conversationHistory.length > 0) {
      // Send last 10 exchanges for context (avoid bloating request)
      body.history = conversationHistory.slice(-20);
    }

    const res = await fetch(getAIChatUrl(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.fallback) {
        console.warn('Claude API unavailable, falling back to mockAI');
        return { text: getMockResponse(question), source: 'mock' };
      }
      throw new Error(err.error || 'AI request failed');
    }

    const data = await res.json();
    return { text: data.response, source: 'claude' };
  } catch (err) {
    console.error('Claude service error:', err);
    return { text: getMockResponse(question), source: 'mock' };
  }
}
