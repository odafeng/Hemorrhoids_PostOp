// Supabase-backed data service
// Replaces LocalStorage with Supabase queries
// Falls back to LocalStorage when offline or unauthenticated (demo mode)

import supabase from './supabaseClient';

// =====================
// Auth helpers
// =====================
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getStudyId() {
  const session = await getSession();
  return session?.user?.user_metadata?.study_id || null;
}

export async function getUserRole() {
  const session = await getSession();
  return session?.user?.user_metadata?.role || null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// =====================
// Patient data
// =====================
export async function getPatient(studyId) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('study_id', studyId)
    .single();
  if (error) return null;
  return data;
}

/**
 * Auto-create a patient record if it doesn't exist yet.
 * Called on first login to prevent FK constraint errors.
 */
export async function ensurePatient(studyId) {
  const existing = await getPatient(studyId);
  if (existing) return existing;

  // Read surgery_date from user metadata (set during registration)
  const { data: { session } } = await supabase.auth.getSession();
  const metaSurgeryDate = session?.user?.user_metadata?.surgery_date;

  const { data, error } = await supabase
    .from('patients')
    .insert({
      study_id: studyId,
      surgery_date: metaSurgeryDate || new Date().toISOString().split('T')[0],
      study_status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('ensurePatient error:', error);
    return null;
  }
  return data;
}

export function getPODFromDate(surgeryDate) {
  const surgery = new Date(surgeryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  surgery.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - surgery) / (1000 * 60 * 60 * 24)));
}

// =====================
// Symptom Reports
// =====================
export async function getAllReports(studyId) {
  const { data, error } = await supabase
    .from('symptom_reports')
    .select('*')
    .eq('study_id', studyId)
    .order('report_date', { ascending: false });
  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data || [];
}

export async function getTodayReport(studyId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('symptom_reports')
    .select('*')
    .eq('study_id', studyId)
    .eq('report_date', today)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function saveReport(studyId, pod, report) {
  const today = new Date().toISOString().split('T')[0];
  const payload = {
    study_id: studyId,
    report_date: today,
    pod: pod,
    pain_nrs: report.pain,
    bleeding: report.bleeding,
    bowel: report.bowel,
    fever: report.fever,
    wound: report.wound,
    report_source: 'app',
  };

  const { data, error } = await supabase
    .from('symptom_reports')
    .upsert(payload, { onConflict: 'study_id,report_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================
// Alerts
// =====================
export async function getAlerts(studyId) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('study_id', studyId)
    .order('triggered_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function createAlert(studyId, alert) {
  // Dedup: skip if an unacknowledged alert of the same type already exists
  const { data: existing } = await supabase
    .from('alerts')
    .select('id')
    .eq('study_id', studyId)
    .eq('alert_type', alert.id)
    .eq('acknowledged', false)
    .limit(1);

  if (existing && existing.length > 0) return; // already exists

  const { error } = await supabase
    .from('alerts')
    .insert({
      study_id: studyId,
      alert_type: alert.id,
      alert_level: alert.type,
      message: alert.message,
    });
  if (error) console.error('Error creating alert:', error);
}

// =====================
// AI Chat
// =====================
export async function getChatLogs(studyId) {
  const { data, error } = await supabase
    .from('ai_chat_logs')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function saveChatLog(studyId, userMessage, aiResponse, topic) {
  const { error } = await supabase
    .from('ai_chat_logs')
    .insert({
      study_id: studyId,
      user_message: userMessage,
      ai_response: aiResponse,
      matched_topic: topic || null,
    });
  if (error) console.error('Error saving chat:', error);
}

// =====================
// Usability Surveys
// =====================
export async function saveSurvey(studyId, pod, survey) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('usability_surveys')
    .insert({
      study_id: studyId,
      survey_date: today,
      pod_at_survey: pod,
      ...survey,
    });
  if (error) throw error;
}

export async function getSurvey(studyId) {
  const { data, error } = await supabase
    .from('usability_surveys')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })
    .maybeSingle();
  if (error) return null;
  return data;
}

// =====================
// Healthcare Utilization
// =====================
export async function getUtilization(studyId) {
  const { data, error } = await supabase
    .from('healthcare_utilization')
    .select('*')
    .eq('study_id', studyId)
    .order('event_date', { ascending: false });
  if (error) return [];
  return data || [];
}

// =====================
// Researcher Queries
// =====================
export async function getAllPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getAdherenceSummary() {
  const { data, error } = await supabase
    .from('v_adherence_summary')
    .select('*');
  if (error) return [];
  return data || [];
}

export async function getAllAlertsForResearcher() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('triggered_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getUnreviewedChats() {
  const { data, error } = await supabase
    .from('ai_chat_logs')
    .select('*')
    .eq('reviewed', false)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function reviewChat(chatId, result, notes, reviewedBy) {
  const { error } = await supabase
    .from('ai_chat_logs')
    .update({
      reviewed: true,
      review_result: result,
      review_notes: notes || null,
      reviewed_by: reviewedBy || 'researcher',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', chatId);
  if (error) throw error;
}
