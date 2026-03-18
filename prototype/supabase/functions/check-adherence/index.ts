// Supabase Edge Function: check-adherence
// Called by GitHub Actions cron to check daily symptom report adherence
// Creates pending_notifications for patients who haven't reported today

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Only allow POST with a secret key (from GitHub Actions)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get all active patients
    const { data: patients, error: patientsError } = await adminClient
      .from("patients")
      .select("study_id, surgery_date")
      .eq("study_status", "active");

    if (patientsError) throw patientsError;

    const today = new Date().toISOString().split("T")[0];
    let reminded = 0;
    let skipped = 0;

    for (const patient of patients || []) {
      // Check if patient reported today
      const { data: report } = await adminClient
        .from("symptom_reports")
        .select("id")
        .eq("study_id", patient.study_id)
        .eq("report_date", today)
        .single();

      if (report) {
        skipped++;
        continue; // Already reported
      }

      // Check if we already sent a notification today
      const { data: existing } = await adminClient
        .from("pending_notifications")
        .select("id")
        .eq("study_id", patient.study_id)
        .eq("type", "reminder")
        .gte("created_at", `${today}T00:00:00`)
        .single();

      if (existing) {
        skipped++;
        continue; // Already notified
      }

      // Calculate POD
      const surgeryDate = new Date(patient.surgery_date);
      const todayDate = new Date(today);
      const pod = Math.floor((todayDate.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only remind POD 0-30
      if (pod < 0 || pod > 30) {
        skipped++;
        continue;
      }

      // Create pending notification
      await adminClient.from("pending_notifications").insert({
        study_id: patient.study_id,
        type: "reminder",
        title: "📋 今日症狀回報提醒",
        message: `您今天（POD ${pod}）尚未填寫症狀回報。`,
      });
      reminded++;
    }

    // Log to audit trail
    await adminClient.from("audit_trail").insert({
      actor_role: "system",
      action: "cron.check_adherence",
      resource: "pending_notifications",
      detail: { date: today, reminded, skipped, total: patients?.length || 0 },
    });

    return new Response(
      JSON.stringify({ date: today, reminded, skipped, total: patients?.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-adherence error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
