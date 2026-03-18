// LocalStorage helpers for symptom data persistence

const REPORTS_KEY = 'hemorrhoid_reports';
const SURGERY_DATE_KEY = 'surgery_date';
const CHAT_KEY = 'chat_history';

export function getSurgeryDate() {
  const date = localStorage.getItem(SURGERY_DATE_KEY);
  if (!date) {
    // Default: today as surgery date for demo
    const today = new Date().toLocaleDateString('en-CA');
    localStorage.setItem(SURGERY_DATE_KEY, today);
    return today;
  }
  return date;
}

export function setSurgeryDate(dateStr) {
  localStorage.setItem(SURGERY_DATE_KEY, dateStr);
}

export function getPOD() {
  const surgeryDate = new Date(getSurgeryDate());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  surgeryDate.setHours(0, 0, 0, 0);
  const diffMs = today - surgeryDate;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getAllReports() {
  const data = localStorage.getItem(REPORTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTodayReport() {
  const today = new Date().toLocaleDateString('en-CA');
  const reports = getAllReports();
  return reports.find(r => r.date === today) || null;
}

export function saveReport(report) {
  const reports = getAllReports();
  const today = new Date().toLocaleDateString('en-CA');
  const existing = reports.findIndex(r => r.date === today);
  
  const fullReport = {
    ...report,
    date: today,
    pod: getPOD(),
    timestamp: new Date().toISOString(),
  };

  if (existing >= 0) {
    reports[existing] = fullReport;
  } else {
    reports.push(fullReport);
  }

  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  return fullReport;
}

export function getReportsForLastNDays(n) {
  const reports = getAllReports();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  return reports.filter(r => new Date(r.date) >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
}

export function getChatHistory() {
  const data = localStorage.getItem(CHAT_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveChatMessage(message) {
  const history = getChatHistory();
  history.push({ ...message, timestamp: new Date().toISOString() });
  localStorage.setItem(CHAT_KEY, JSON.stringify(history));
}

// =====================
// Survey (Demo mode)
// =====================
const SURVEY_KEY = 'usability_survey';

export function getSurveyLocal() {
  const data = localStorage.getItem(SURVEY_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveSurveyLocal(survey) {
  const record = {
    ...survey,
    date: new Date().toLocaleDateString('en-CA'),
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(SURVEY_KEY, JSON.stringify(record));
  return record;
}

export function clearAllData() {
  localStorage.removeItem(REPORTS_KEY);
  localStorage.removeItem(SURGERY_DATE_KEY);
  localStorage.removeItem(CHAT_KEY);
  localStorage.removeItem(SURVEY_KEY);
}

// Seed demo data for demonstration
export function seedDemoData() {
  const reports = getAllReports();
  if (reports.length > 0) return; // already have data

  const today = new Date();
  const surgeryDate = new Date(today);
  surgeryDate.setDate(surgeryDate.getDate() - 5);
  setSurgeryDate(surgeryDate.toLocaleDateString('en-CA'));

  const demoReports = [
    { pain: 7, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 0 },
    { pain: 8, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 1 },
    { pain: 9, bleeding: '持續', bowel: '未排', fever: false, wound: '腫脹', pod: 2 },
    { pain: 7, bleeding: '少量', bowel: '困難', fever: false, wound: '無異常', pod: 3 },
    { pain: 5, bleeding: '無', bowel: '正常', fever: false, wound: '無異常', pod: 4 },
  ];

  const allReports = demoReports.map((r, i) => {
    const date = new Date(surgeryDate);
    date.setDate(date.getDate() + i);
    return {
      ...r,
      date: date.toLocaleDateString('en-CA'),
      timestamp: date.toISOString(),
    };
  });

  localStorage.setItem(REPORTS_KEY, JSON.stringify(allReports));
}

// =====================
// Researcher Mock Data (Demo mode)
// =====================
export function getResearcherMockData() {
  const today = new Date();
  const patients = [
    { study_id: 'HEM-001', age: 45, sex: 'M', surgery_type: 'hemorrhoidectomy', surgery_date: _daysAgo(today, 18), study_status: 'active' },
    { study_id: 'HEM-002', age: 62, sex: 'F', surgery_type: 'stapled hemorrhoidopexy', surgery_date: _daysAgo(today, 12), study_status: 'active' },
    { study_id: 'HEM-003', age: 38, sex: 'M', surgery_type: 'hemorrhoidectomy', surgery_date: _daysAgo(today, 7), study_status: 'active' },
    { study_id: 'HEM-004', age: 55, sex: 'F', surgery_type: 'hemorrhoidectomy', surgery_date: _daysAgo(today, 3), study_status: 'active' },
  ];

  const adherence = [
    { study_id: 'HEM-001', total_reports: 16, max_pod: 17, adherence_pct: 88.9, min_pain: 2, max_pain: 9, avg_pain: 5.2, had_alerts: true },
    { study_id: 'HEM-002', total_reports: 9, max_pod: 11, adherence_pct: 75.0, min_pain: 1, max_pain: 7, avg_pain: 3.8, had_alerts: false },
    { study_id: 'HEM-003', total_reports: 7, max_pod: 6, adherence_pct: 100.0, min_pain: 3, max_pain: 8, avg_pain: 5.9, had_alerts: true },
    { study_id: 'HEM-004', total_reports: 2, max_pod: 2, adherence_pct: 66.7, min_pain: 5, max_pain: 7, avg_pain: 6.0, had_alerts: false },
  ];

  const alerts = [
    { id: 1, study_id: 'HEM-001', alert_type: 'pain', alert_level: 'danger', message: 'NRS ≥ 8 連續 3 次', triggered_at: _daysAgo(today, 15), acknowledged: true },
    { id: 2, study_id: 'HEM-001', alert_type: 'bleeding', alert_level: 'danger', message: '出血「持續」連續 2 次', triggered_at: _daysAgo(today, 14), acknowledged: true },
    { id: 3, study_id: 'HEM-003', alert_type: 'bowel', alert_level: 'warning', message: '連續 ≥ 3 天未排便', triggered_at: _daysAgo(today, 4), acknowledged: false },
  ];

  const chatLogs = [
    { id: 1, study_id: 'HEM-001', user_message: '手術後多久可以開始運動？', ai_response: '一般建議術後 2-4 週避免劇烈運動，但緩步行走有助復原。', reviewed: true, review_result: 'correct', created_at: _daysAgo(today, 16) },
    { id: 2, study_id: 'HEM-001', user_message: '傷口有少量出血正常嗎？', ai_response: '術後少量出血是正常的，但如果持續出血或出現血塊，建議聯絡醫療團隊。', reviewed: false, review_result: null, created_at: _daysAgo(today, 10) },
    { id: 3, study_id: 'HEM-002', user_message: '可以吃辣嗎？', ai_response: '建議術後 2-4 週避免辛辣刺激性食物與酒精，以免刺激傷口。', reviewed: false, review_result: null, created_at: _daysAgo(today, 8) },
    { id: 4, study_id: 'HEM-003', user_message: '三天沒排便怎麼辦？', ai_response: '便秘是術後常見問題，建議增加高纖飲食、每日飲水 2000ml，並可諮詢醫師是否需要軟便劑。', reviewed: false, review_result: null, created_at: _daysAgo(today, 5) },
    { id: 5, study_id: 'HEM-003', user_message: '需要開什麼藥給我嗎？', ai_response: '這個問題需要醫療專業人員提供個別化的回答。建議您聯絡您的醫療團隊或在下次回診時向醫師諮詢。', reviewed: false, review_result: null, created_at: _daysAgo(today, 4) },
  ];

  return { patients, adherence, alerts, chatLogs };
}

function _daysAgo(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
}
