// LocalStorage helpers for symptom data persistence

const REPORTS_KEY = 'hemorrhoid_reports';
const SURGERY_DATE_KEY = 'surgery_date';
const CHAT_KEY = 'chat_history';

export function getSurgeryDate() {
  const date = localStorage.getItem(SURGERY_DATE_KEY);
  if (!date) {
    // Default: today as surgery date for demo
    const today = new Date().toISOString().split('T')[0];
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
  const today = new Date().toISOString().split('T')[0];
  const reports = getAllReports();
  return reports.find(r => r.date === today) || null;
}

export function saveReport(report) {
  const reports = getAllReports();
  const today = new Date().toISOString().split('T')[0];
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

export function clearAllData() {
  localStorage.removeItem(REPORTS_KEY);
  localStorage.removeItem(SURGERY_DATE_KEY);
  localStorage.removeItem(CHAT_KEY);
}

// Seed demo data for demonstration
export function seedDemoData() {
  const reports = getAllReports();
  if (reports.length > 0) return; // already have data

  const today = new Date();
  const surgeryDate = new Date(today);
  surgeryDate.setDate(surgeryDate.getDate() - 5);
  setSurgeryDate(surgeryDate.toISOString().split('T')[0]);

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
      date: date.toISOString().split('T')[0],
      timestamp: date.toISOString(),
    };
  });

  localStorage.setItem(REPORTS_KEY, JSON.stringify(allReports));
}
