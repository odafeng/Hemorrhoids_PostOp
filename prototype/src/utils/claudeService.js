// Claude AI Service — calls Edge Function or local proxy
// Falls back to mockAI if the service is unavailable

import { getAIResponse as getMockResponse } from './mockAI';

/**
 * Resolve the AI chat endpoint URL:
 * - If VITE_SUPABASE_URL is configured → use Supabase Edge Function
 * - Otherwise → fallback to local dev proxy (/api/ai-chat via Vite proxy)
 */
function getAIChatUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/ai-chat`;
  }
  // Local dev fallback — Vite proxy forwards /api to localhost:3001
  return '/api/ai-chat';
}

/**
 * Build request headers.
 * Edge Functions require the anon key as Authorization Bearer token.
 */
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
 * @param {object} [recentSymptoms] - Optional recent symptom summary for context
 * @returns {Promise<string>} AI response text
 */
export async function getClaudeResponse(question, recentSymptoms = null) {
  try {
    const body = { question };
    if (recentSymptoms) {
      body.recentSymptoms = recentSymptoms;
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
        return getMockResponse(question);
      }
      throw new Error(err.error || 'AI request failed');
    }

    const data = await res.json();
    return data.response;
  } catch (err) {
    console.error('Claude service error:', err);
    // Fallback to mock AI
    return getMockResponse(question);
  }
}
