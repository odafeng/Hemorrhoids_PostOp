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
