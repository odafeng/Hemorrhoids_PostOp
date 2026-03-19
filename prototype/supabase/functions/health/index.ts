// Supabase Edge Function: health
// Simple health check — verifies DB connectivity
// Deploy: supabase functions deploy health --no-verify-jwt

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const start = Date.now();
  const checks: Record<string, string> = {};

  // Check DB connectivity
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const { count, error } = await client
      .from("patients")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    checks.database = "ok";
    checks.patients_count = String(count ?? 0);
  } catch (e) {
    checks.database = `error: ${e.message}`;
  }

  // Check Claude API key exists
  checks.claude_api = Deno.env.get("CLAUDE_API_KEY") ? "configured" : "missing";

  // Check VAPID keys
  checks.vapid = Deno.env.get("VAPID_PUBLIC_KEY") ? "configured" : "missing";

  const latency = Date.now() - start;
  const allOk = checks.database === "ok" && checks.claude_api === "configured";

  return new Response(
    JSON.stringify({
      status: allOk ? "healthy" : "degraded",
      latency_ms: latency,
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: allOk ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    },
  );
});
