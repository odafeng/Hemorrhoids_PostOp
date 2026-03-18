// AI Chat Proxy Server
// Forwards requests to Claude API without exposing the API key to the browser
// Usage: node api-proxy.mjs

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no external deps needed)
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '.env');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const CLAUDE_API_KEY = env.CLAUDE_API_KEY;
const PORT = 3001;

if (!CLAUDE_API_KEY) {
  console.error('❌ CLAUDE_API_KEY not found in .env');
  process.exit(1);
}

// =====================================================
// System Prompt — loaded from shared source of truth
// =====================================================
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { system_prompt: SYSTEM_PROMPT } = require('./shared/system-prompt.json');

// =====================================================
// HTTP Server
// =====================================================
const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/ai-chat') {
    let body = '';
    for await (const chunk of req) body += chunk;

    try {
      const { question, recentSymptoms } = JSON.parse(body);

      if (!question || typeof question !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'question is required' }));
        return;
      }

      // Build user message with optional symptom context
      let userMessage = question.trim();
      if (recentSymptoms) {
        userMessage += `\n\n[病人近期症狀摘要（去識別化）：${JSON.stringify(recentSymptoms)}]`;
      }

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API error:', response.status, errText);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI service unavailable', fallback: true }));
        return;
      }

      const data = await response.json();
      const aiText = data.content?.[0]?.text || '抱歉，目前無法回覆，請稍後再試。';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response: aiText, model: data.model }));

    } catch (err) {
      console.error('Proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', fallback: true }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🤖 AI Proxy Server running at http://localhost:${PORT}`);
  console.log(`   POST /api/ai-chat → Claude API (claude-3-5-haiku-latest)`);
});
