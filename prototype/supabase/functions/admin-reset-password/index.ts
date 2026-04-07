// Supabase Edge Function: admin-reset-password
// Allows researchers/PI to reset a patient's password
// Uses service_role to call admin API

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is researcher or PI
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = user.user_metadata?.role;
    if (callerRole !== "researcher" && callerRole !== "pi") {
      return new Response(JSON.stringify({ error: "Only researchers/PI can reset passwords" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, newPassword } = await req.json();
    if (!email || !newPassword) {
      return new Response(JSON.stringify({ error: "email and newPassword are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "密碼至少需要 6 個字元" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin API to find user by email and reset password
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = users.find((u) => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: `找不到帳號: ${email}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // Audit trail
    await adminClient.from("audit_trail").insert({
      actor_id: user.id,
      actor_role: callerRole,
      action: "admin.reset_password",
      resource: "auth.users",
      resource_id: targetUser.user_metadata?.study_id || email,
      detail: { target_email: email },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-reset-password error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
