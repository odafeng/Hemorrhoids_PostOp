// Custom React Query hooks for patient data
// Handles both demo (localStorage) and Supabase modes

import { useQuery } from '@tanstack/react-query';
import {
  getPOD, getTodayReport as getLocalToday,
  getAllReports as getLocalReports, getSurgeryDate,
  getSurveyLocal,
} from './storage';
import * as sb from './supabaseService';
import { checkAlerts } from './alerts';

// Map server-side alert rows to the display shape Dashboard expects
const ALERT_DISPLAY = {
  high_pain:            { icon: '🔴', title: '持續性高度疼痛' },
  ascending_pain:       { icon: '📈', title: '疼痛逐日上升' },
  persistent_bleeding:  { icon: '🩸', title: '持續性出血' },
  blood_clot:           { icon: '🩸', title: '出血伴隨血塊' },
  no_bowel:             { icon: '⚠️', title: '超過3天未排便' },
  fever:                { icon: '🌡️', title: '發燒' },
  urinary_retention:    { icon: '🚨', title: '完全尿不出來' },
  urinary_difficulty:   { icon: '⚠️', title: '排尿困難' },
  incontinence:         { icon: '🚨', title: '肛門失禁' },
  soiling:              { icon: '⚠️', title: '持續滲便' },
};

function mapServerAlerts(serverAlerts) {
  return serverAlerts
    .filter(a => !a.acknowledged)
    .map(a => {
      const display = ALERT_DISPLAY[a.alert_type] || { icon: '⚠️', title: a.alert_type };
      return {
        id: a.id,
        type: a.alert_level || 'warning',
        icon: display.icon,
        title: display.title,
        message: a.message,
      };
    });
}

/**
 * Fetch all patient dashboard data in one query.
 * Returns: { pod, surgeryDate, todayReport, allReports, alerts, adherence, surveyDone }
 */
export function useDashboardData(isDemo, userInfo) {
  return useQuery({
    queryKey: ['dashboard', isDemo, userInfo?.studyId],
    queryFn: async () => {
      if (isDemo) {
        const pod = getPOD();
        const todayReport = getLocalToday();
        const allReports = getLocalReports();
        const surgeryDate = getSurgeryDate();
        const mapped = allReports.map(r => ({ ...r, pain: r.pain ?? r.pain_nrs }));
        const alerts = checkAlerts(mapped);
        const totalDays = Math.max(1, pod + 1);
        const adherence = Math.round((allReports.length / totalDays) * 100);
        const surveyDone = getSurveyLocal() !== null;
        return { pod, surgeryDate, todayReport, allReports, alerts, adherence, surveyDone };
      }

      // Supabase mode
      const studyId = userInfo?.studyId;
      if (!studyId) throw new Error('No study ID');

      const patient = await sb.getPatient(studyId);
      if (!patient) {
        throw new Error('MISSING_PATIENT: No patient record found for study_id=' + studyId +
          '. Possible causes: RLS policy, session mismatch, or patient-onboard not completed.');
      }
      if (!patient.surgery_date) {
        throw new Error('MISSING_SURGERY_DATE: Patient record exists but surgery_date is null for study_id=' + studyId);
      }
      const surgeryDate = patient.surgery_date;
      const pod = sb.getPODFromDate(surgeryDate);
      const allReports = await sb.getAllReports(studyId);
      const todayReport = await sb.getTodayReport(studyId);

      // Alerts: server-side only (from DB trigger fn_check_alerts)
      const serverAlerts = await sb.getAlerts(studyId);
      const alerts = mapServerAlerts(serverAlerts);

      const totalDays = Math.max(1, pod + 1);
      const adherence = Math.round((allReports.length / totalDays) * 100);

      let surveyDone = false;
      try {
        const survey = await sb.getSurvey(studyId);
        surveyDone = !!survey;
      } catch { /* ignore */ }

      return { pod, surgeryDate, todayReport, allReports, alerts, adherence, surveyDone };
    },
    staleTime: 30_000, // Cache for 30 seconds
    retry: 2,
    enabled: isDemo || !!userInfo?.studyId,
  });
}

/**
 * Fetch history reports with normalized field names.
 */
export function useHistoryData(isDemo, userInfo) {
  return useQuery({
    queryKey: ['history', isDemo, userInfo?.studyId],
    queryFn: async () => {
      if (isDemo) {
        return getLocalReports().sort((a, b) => b.date.localeCompare(a.date));
      }

      const studyId = userInfo?.studyId;
      if (!studyId) throw new Error('No study ID');

      const reports = await sb.getAllReports(studyId);
      return reports.map(r => ({
        date: r.report_date,
        pod: r.pod,
        pain: r.pain_nrs,
        bleeding: r.bleeding,
        bowel: r.bowel,
        fever: r.fever,
        wound: r.wound,
        urinary: r.urinary,
        continence: r.continence,
      }));
    },
    staleTime: 30_000,
    retry: 2,
    enabled: isDemo || !!userInfo?.studyId,
  });
}
