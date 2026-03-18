// Claude AI Service — calls the proxy server at /api/ai-chat
// Falls back to mockAI if the proxy is unavailable

import { getAIResponse as getMockResponse } from './mockAI';

/**
 * Get AI response from Claude API via proxy server
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

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
