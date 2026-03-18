import { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SymptomReport from './pages/SymptomReport';
import History from './pages/History';
import AIChat from './pages/AIChat';
import UsabilitySurvey from './pages/UsabilitySurvey';
import ResearcherDashboard from './pages/ResearcherDashboard';
import ChatReview from './pages/ChatReview';
import { onAuthStateChange, getSession, getStudyId, getPatient, ensurePatient, getPODFromDate, signOut } from './utils/supabaseService';
import { seedDemoData, getTodayReport as getLocalTodayReport } from './utils/storage';
import { startReminderScheduler, stopReminderScheduler, isNotificationsEnabled } from './utils/notifications';
import * as sb from './utils/supabaseService';

const patientTabs = [
  { id: 'dashboard', label: '首頁', icon: '🏠' },
  { id: 'report', label: '回報', icon: '📋' },
  { id: 'history', label: '紀錄', icon: '📊' },
  { id: 'chat', label: 'AI 衛教', icon: '💬' },
];

const researcherTabs = [
  { id: 'researcherDashboard', label: '概覽', icon: '📊' },
  { id: 'chatReview', label: '審核', icon: '🔍' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'loggedIn' | 'loggedOut'
  const [isDemo, setIsDemo] = useState(false);
  const [userInfo, setUserInfo] = useState(null); // { studyId, role, surgeryDate, pod }

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (session) {
        await loadUserInfo(session);
        setAuthState('loggedIn');
      } else {
        setAuthState('loggedOut');
      }
    };
    checkAuth();

    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      if (session) {
        await loadUserInfo(session);
        setAuthState('loggedIn');
      } else {
        setAuthState('loggedOut');
        setUserInfo(null);
        setIsDemo(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Notification scheduler + SW message handler
  useEffect(() => {
    if (authState !== 'loggedIn') return;

    // Build check function based on mode
    const checkReported = async () => {
      if (isDemo) {
        return getLocalTodayReport() !== null;
      } else if (userInfo?.studyId) {
        const report = await sb.getTodayReport(userInfo.studyId);
        return report !== null;
      }
      return true; // Default: don't notify
    };

    startReminderScheduler(checkReported);

    // Listen for SW messages (notification click → navigate to report)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.tab) {
        setActiveTab(event.data.tab);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      stopReminderScheduler();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [authState, isDemo, userInfo]);

  const loadUserInfo = async (session) => {
    const studyId = session?.user?.user_metadata?.study_id;
    const role = session?.user?.user_metadata?.role || 'patient';
    if (studyId) {
      // Auto-create patient record on first login
      const patient = role === 'patient'
        ? await ensurePatient(studyId)
        : await getPatient(studyId);
      setUserInfo({
        studyId,
        role,
        surgeryDate: patient?.surgery_date || null,
        pod: patient?.surgery_date ? getPODFromDate(patient.surgery_date) : 0,
      });
    }
  };

  const handleLogin = (info) => {
    if (info?.demo) {
      setIsDemo(true);
      const role = info.role || 'patient';
      const isResearcherLogin = role === 'researcher' || role === 'pi';
      if (!isResearcherLogin) seedDemoData();
      setUserInfo({
        studyId: info.studyId || 'DEMO-001',
        role,
        surgeryDate: null,
        pod: 0,
      });
      setActiveTab(isResearcherLogin ? 'researcherDashboard' : 'dashboard');
      setAuthState('loggedIn');
    }
    // For Supabase login, onAuthStateChange will handle it
  };

  const handleLogout = async () => {
    stopReminderScheduler();
    if (isDemo) {
      setIsDemo(false);
      setUserInfo(null);
      setAuthState('loggedOut');
    } else {
      await signOut();
    }
  };

  const handleReportComplete = () => {
    setRefreshKey(k => k + 1);
    setActiveTab('dashboard');
  };

  const handleSurveyComplete = () => {
    setRefreshKey(k => k + 1);
    setActiveTab('dashboard');
  };

  const isResearcherRole = userInfo?.role === 'researcher' || userInfo?.role === 'pi';
  const tabs = isResearcherRole ? researcherTabs : patientTabs;

  const renderPage = () => {
    const commonProps = {
      isDemo,
      userInfo,
      onLogout: handleLogout,
    };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={refreshKey} onNavigate={setActiveTab} {...commonProps} />;
      case 'report':
        return <SymptomReport onComplete={handleReportComplete} {...commonProps} />;
      case 'history':
        return <History key={refreshKey} {...commonProps} />;
      case 'chat':
        return <AIChat {...commonProps} />;
      case 'survey':
        return <UsabilitySurvey onComplete={handleSurveyComplete} {...commonProps} />;
      case 'researcherDashboard':
        return <ResearcherDashboard key={refreshKey} onNavigate={setActiveTab} {...commonProps} />;
      case 'chatReview':
        return <ChatReview onNavigate={setActiveTab} {...commonProps} />;
      default:
        return isResearcherRole
          ? <ResearcherDashboard key={refreshKey} onNavigate={setActiveTab} {...commonProps} />
          : <Dashboard key={refreshKey} onNavigate={setActiveTab} {...commonProps} />;
    }
  };

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)', animation: 'pulse 1s infinite' }}>🏥</div>
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (authState === 'loggedOut') {
    return <Login onLogin={handleLogin} />;
  }

  // Logged in — show main app
  return (
    <>
      {renderPage()}
      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
