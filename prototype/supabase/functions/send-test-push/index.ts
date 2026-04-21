// Supabase Edge Function: send-test-push
// Fires a real Web Push (FCM / APNs) to the caller's own push subscription,
// so the test matches production behavior (cron path via check-adherence):
// the notification arrives from server over the network, SW push handler runs,
// Android / iOS surface it as a full system notification with sound + vibrate,
// bypassing the foreground in-app heads-up suppression.
//
// Security: verify_jwt=false at platform level, auth enforced inside via
// auth.getUser() (same pattern as patient-onboard / researcher-manage).
// Only sends to push_subscriptions owned by the caller's own study_id
// (read from app_metadata.study_id — the trusted RLS claim source).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendPushToMany } from "../_shared/web-push.ts";

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify user
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Trust only app_metadata for study_id (RLS convention)
  const studyId = user.app_metadata?.study_id as string | undefined;
  if (!studyId) {
    return new Response(
      JSON.stringify({ error: "No study_id on account", reason: "no-study-id" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@example.com";
  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(
      JSON.stringify({ error: "Push not configured", reason: "no-vapid" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Fetch this user's push subscriptions only
  const { data: subscriptions, error: subError } = await admin
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("study_id", studyId);

  if (subError) {
    console.error("[send-test-push] sub fetch error:", subError.message);
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscriptions", reason: "db-error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(
      JSON.stringify({ error: "No push subscription", reason: "no-subscription" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const payload = {
    title: "🔔 測試通知",
    body: "這是一則測試通知 — 若您看到這則訊息並有聲音／震動，代表推播功能運作正常。",
    tag: "test-push",
  };

  const { results, expired } = await sendPushToMany(
    subscriptions,
    payload,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
  );

  // Clean up expired (404 / 410)
  if (expired.length > 0) {
    for (const endpoint of expired) {
      await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;

  // Audit
  await admin.from("audit_trail").insert({
    actor_id: user.id,
    actor_role: user.app_metadata?.role || "patient",
    action: "notifications.test_push",
    resource: "push_subscriptions",
    resource_id: studyId,
    detail: { sent, failed, expired_cleaned: expired.length },
  });

  if (sent === 0) {
    return new Response(
      JSON.stringify({
        error: "All pushes failed",
        reason: "all-failed",
        sent,
        failed,
        details: results.map((r) => ({ status: r.status, error: r.error?.slice(0, 120) })),
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ sent, failed, expired_cleaned: expired.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
