// Supabase Edge Function: patient-onboard
// Creates patient record on first login (replaces client-side ensurePatient)
// Uses service_role key so RLS doesn't block the insert

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
    // Verify the caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with the user's JWT to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studyId = user.user_metadata?.study_id;
    const surgeryDate = user.user_metadata?.surgery_date;
    const role = user.user_metadata?.role || "patient";

    if (!studyId) {
      return new Response(JSON.stringify({ error: "No study_id in user metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service_role client to bypass RLS for patient insert
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if patient already exists (skip token check for existing patients)
    const { data: existing } = await adminClient
      .from("patients")
      .select("*")
      .eq("study_id", studyId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ patient: existing }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Invite token validation (new patients only) ---
    // Two-tier: per-patient token (study_invites table) OR global token (env var)
    let body: { invite_token?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is ok for backwards compat, but token will be required
    }

    const inviteToken = body.invite_token;
    if (!inviteToken) {
      return new Response(JSON.stringify({ error: "invite_token is required for new patient registration" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier 1: check per-patient token in study_invites table
    let invite = null;
    const { data: inviteRow } = await adminClient
      .from("study_invites")
      .select("*")
      .eq("invite_token", inviteToken)
      .eq("study_id", studyId)
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (inviteRow) {
      invite = inviteRow;
    } else {
      // Tier 2: check global invite token (pilot phase convenience)
      const globalToken = Deno.env.get("GLOBAL_INVITE_TOKEN") || "HEMORRHOID2026";
      if (inviteToken.toUpperCase() !== globalToken.toUpperCase()) {
        console.error("Invite validation failed:", { studyId, inviteToken: "[redacted]" });
        return new Response(JSON.stringify({ error: "Invalid or expired invite token" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Global token matched — proceed without study_invites row
    }

    // Parse surgeon prefix from study_id (e.g. "HSF-001" → "HSF")
    const surgeonId = studyId.includes("-") ? studyId.split("-")[0].toUpperCase() : null;

    // Create new patient record
    const { data: patient, error: insertError } = await adminClient
      .from("patients")
      .insert({
        study_id: studyId,
        surgery_date: surgeryDate || new Date().toISOString().split("T")[0],
        study_status: "active",
        surgeon_id: surgeonId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Patient insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create patient" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark per-patient invite token as used (skip if global token was used)
    if (invite) {
      await adminClient
        .from("study_invites")
        .update({
          status: "used",
          used_by_user_id: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", invite.id);
    }

    // Audit trail: patient onboarding
    await adminClient.from("audit_trail").insert({
      actor_id: user.id,
      actor_role: "patient",
      action: "patient.onboard",
      resource: "patients",
      resource_id: studyId,
      detail: {
        surgery_date: patient.surgery_date,
        invite_method: invite ? "per_patient_token" : "global_token",
      },
    });

    return new Response(JSON.stringify({ patient }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("patient-onboard error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
