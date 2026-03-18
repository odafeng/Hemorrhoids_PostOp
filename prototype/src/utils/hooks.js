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
      const surgeryDate = patient?.surgery_date || new Date().toLocaleDateString('en-CA');
      const pod = sb.getPODFromDate(surgeryDate);
      const allReports = await sb.getAllReports(studyId);
      const todayReport = await sb.getTodayReport(studyId);

      const mapped = allReports.map(r => ({
        date: r.report_date,
        pain: r.pain_nrs,
        bleeding: r.bleeding,
        bowel: r.bowel,
        fever: r.fever,
        wound: r.wound,
        urinary: r.urinary,
        continence: r.continence,
      }));
      const alerts = checkAlerts(mapped);
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
