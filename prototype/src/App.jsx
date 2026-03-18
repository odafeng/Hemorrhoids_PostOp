import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SymptomReport from './pages/SymptomReport';
import History from './pages/History';
import AIChat from './pages/AIChat';
import UsabilitySurvey from './pages/UsabilitySurvey';
import ResearcherDashboard from './pages/ResearcherDashboard';
import ChatReview from './pages/ChatReview';
import OfflineBanner from './components/OfflineBanner';
import { onAuthStateChange, getSession, getStudyId, getPatient, ensurePatient, getPODFromDate, signOut } from './utils/supabaseService';
import { seedDemoData, getTodayReport as getLocalTodayReport } from './utils/storage';
import { startReminderScheduler, stopReminderScheduler } from './utils/notifications';
import * as sb from './utils/supabaseService';

const patientTabs = [
  { path: '/', label: '首頁', icon: '🏠' },
  { path: '/report', label: '回報', icon: '📋' },
  { path: '/history', label: '紀錄', icon: '📊' },
  { path: '/chat', label: 'AI 衛教', icon: '💬' },
];

const researcherTabs = [
  { path: '/researcher', label: '概覽', icon: '📊' },
  { path: '/review', label: '審核', icon: '🔍' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [authState, setAuthState] = useState('loading');
  const [isDemo, setIsDemo] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

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

    const checkReported = async () => {
      if (isDemo) {
        return getLocalTodayReport() !== null;
      } else if (userInfo?.studyId) {
        const report = await sb.getTodayReport(userInfo.studyId);
        return report !== null;
      }
      return true;
    };

    startReminderScheduler(checkReported);

    const handleSWMessage = (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      stopReminderScheduler();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [authState, isDemo, userInfo, navigate]);

  const loadUserInfo = async (session) => {
    const studyId = session?.user?.user_metadata?.study_id;
    const role = session?.user?.user_metadata?.role || 'patient';
    if (studyId) {
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
      setAuthState('loggedIn');
      navigate(isResearcherLogin ? '/researcher' : '/');
    }
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
    navigate('/');
  };

  const handleReportComplete = () => {
    setRefreshKey(k => k + 1);
    navigate('/');
  };

  const handleSurveyComplete = () => {
    setRefreshKey(k => k + 1);
    navigate('/');
  };

  const isResearcherRole = userInfo?.role === 'researcher' || userInfo?.role === 'pi';
  const tabs = isResearcherRole ? researcherTabs : patientTabs;

  const commonProps = {
    isDemo,
    userInfo,
    onLogout: handleLogout,
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

  // Logged in — URL-based routing
  return (
    <>
      <OfflineBanner />
      <Routes>
        {/* Patient routes */}
        <Route path="/" element={
          isResearcherRole
            ? <Navigate to="/researcher" replace />
            : <Dashboard key={refreshKey} onNavigate={(tab) => {
                const pathMap = { report: '/report', history: '/history', chat: '/chat', survey: '/survey' };
                navigate(pathMap[tab] || '/');
              }} {...commonProps} />
        } />
        <Route path="/report" element={<SymptomReport onComplete={handleReportComplete} {...commonProps} />} />
        <Route path="/history" element={<History key={refreshKey} {...commonProps} />} />
        <Route path="/chat" element={<AIChat {...commonProps} />} />
        <Route path="/survey" element={<UsabilitySurvey onComplete={handleSurveyComplete} {...commonProps} />} />

        {/* Researcher routes */}
        <Route path="/researcher" element={
          <ResearcherDashboard key={refreshKey} onNavigate={(tab) => {
            const pathMap = { chatReview: '/review' };
            navigate(pathMap[tab] || '/researcher');
          }} {...commonProps} />
        } />
        <Route path="/review" element={<ChatReview onNavigate={(tab) => {
          navigate(tab === 'researcherDashboard' ? '/researcher' : '/review');
        }} {...commonProps} />} />

        {/* Catch-all: redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <nav className="bottom-nav">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={tab.path === '/' || tab.path === '/researcher'}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
