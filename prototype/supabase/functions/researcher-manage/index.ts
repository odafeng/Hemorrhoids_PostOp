// Supabase Edge Function: researcher-manage
// PI-only actions on researcher/PI user accounts:
//   action=list  → list all users with role in (researcher, pi)
//   action=ban   → disable user by setting ban_duration to 100 years
//   action=unban → re-enable user (ban_duration=none)

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller = PI
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
    if (user.user_metadata?.role !== "pi") {
      return new Response(JSON.stringify({ error: "只有主持人（PI）可以管理研究人員帳號" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action: string = body.action;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "list") {
      const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;
      const researchers = users
        .filter((u) => {
          const r = u.user_metadata?.role;
          return r === "researcher" || r === "pi";
        })
        .map((u) => ({
          id: u.id,
          email: u.email,
          display_name: u.user_metadata?.display_name || null,
          role: u.user_metadata?.role,
          invited_at: u.user_metadata?.invited_at || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          banned_until: (u as unknown as { banned_until?: string }).banned_until || null,
        }))
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
      return new Response(JSON.stringify({ users: researchers }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban" || action === "unban") {
      const targetId: string = body.user_id;
      if (!targetId) {
        return new Response(JSON.stringify({ error: "缺少 user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Prevent PI from banning themselves
      if (targetId === user.id) {
        return new Response(JSON.stringify({ error: "不能停用自己的帳號" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ~100 years = practically permanent; unban → 'none'
      // Supabase JS v2 accepts ban_duration on updateUserById
      const banDuration = action === "ban" ? "876000h" : "none";
      const { data, error } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: banDuration,
      } as unknown as Record<string, unknown>);
      if (error) throw error;

      await admin.from("audit_trail").insert({
        actor_id: user.id,
        actor_role: "pi",
        action: action === "ban" ? "admin.ban_user" : "admin.unban_user",
        resource: "auth.users",
        resource_id: targetId,
        detail: { target_email: data.user?.email },
      });

      return new Response(JSON.stringify({ success: true, action, user_id: targetId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("researcher-manage error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
