// Supabase Edge Function: ai-chat
// Proxies requests to Claude API without exposing the API key
// Deploy: supabase functions deploy ai-chat

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SYSTEM_PROMPT } from "./_prompt.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS — restrict to production domain + local dev
const ALLOWED_ORIGINS = [
  "https://prototype-zeta-black.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Simple in-memory rate limiting (per edge instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "請求過於頻繁，請稍後再試", fallback: true }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Authenticate user via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — please log in" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify JWT is a real user (not just anon key)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    console.error("Auth failed:", authError?.message || "no user", "header starts with:", authHeader.substring(0, 20));
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Metrics logging helper
  const startTime = Date.now();
  const logMetrics = async (status: string, error?: string, tokens?: { input: number, output: number }) => {
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("ai_request_logs").insert({
        user_id: user.id,
        study_id: user.user_metadata?.study_id || null,
        latency_ms: Date.now() - startTime,
        status,
        error_message: error || null,
        model: "claude-sonnet-4-20250514",
        input_tokens: tokens?.input || null,
        output_tokens: tokens?.output || null,
      });
    } catch (e) {
      console.warn("Failed to log AI metrics:", e);
    }
  };

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not configured");
      await logMetrics("error", "CLAUDE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { question, recentSymptoms, history } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let userMessage = question.trim();
    if (recentSymptoms) {
      userMessage += `\n\n[病人近期症狀摘要（去識別化）：${JSON.stringify(recentSymptoms)}]`;
    }

    // Build multi-turn messages from conversation history
    // Limit: last 10 turns, max 4000 chars total to stay within token budget
    const messages: Array<{role: string, content: string}> = [];
    if (Array.isArray(history) && history.length > 0) {
      let totalChars = 0;
      const MAX_HISTORY_CHARS = 4000;
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        const content = typeof msg.text === 'string' ? msg.text.slice(0, 500) : '';
        if (totalChars + content.length > MAX_HISTORY_CHARS) break;
        if (msg.role === 'user') {
          messages.push({ role: 'user', content });
        } else if (msg.role === 'ai') {
          messages.push({ role: 'assistant', content });
        }
        totalChars += content.length;
      }
    }
    messages.push({ role: "user", content: userMessage });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      await logMetrics("error", `Claude ${response.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const aiText =
      data.content?.[0]?.text || "抱歉，目前無法回覆，請稍後再試。";

    // Log successful request with token usage
    await logMetrics("success", undefined, {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
    });

    // Audit trail: AI chat request
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("audit_trail").insert({
        actor_id: user.id,
        actor_role: user.user_metadata?.role || "patient",
        action: "ai.chat_request",
        resource: "ai_chat_logs",
        resource_id: user.user_metadata?.study_id || null,
        detail: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0,
          latency_ms: Date.now() - startTime,
        },
      });
    } catch (e) {
      console.warn("Failed to write AI audit trail:", e);
    }

    return new Response(
      JSON.stringify({ response: aiText, model: data.model }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    await logMetrics("error", err.message || "Internal error");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
