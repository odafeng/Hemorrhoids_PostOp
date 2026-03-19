import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SymptomReport from './pages/SymptomReport';
import History from './pages/History';
import AIChat from './pages/AIChat';
import UsabilitySurvey from './pages/UsabilitySurvey';
import ResearcherDashboard from './pages/ResearcherDashboard';
import ResearcherPatientLookup from './pages/ResearcherPatientLookup';
import ChatReview from './pages/ChatReview';
import OfflineBanner from './components/OfflineBanner';
import IOSInstallPrompt from './components/IOSInstallPrompt';
import UpdateBanner from './components/UpdateBanner';
import PageErrorBoundary from './components/PageErrorBoundary';
import { installGlobalErrorHandlers, initSentry } from './utils/errorLogger';
import { useAuth } from './utils/useAuth';
import { getTodayReport as getLocalTodayReport } from './utils/storage';
import { startReminderScheduler, stopReminderScheduler } from './utils/notifications';
import { signOut } from './utils/supabaseService';
import * as sb from './utils/supabaseService';

initSentry();
installGlobalErrorHandlers();

const patientTabs = [
  { path: '/', label: '首頁', icon: '🏠' },
  { path: '/report', label: '回報', icon: '📋' },
  { path: '/history', label: '紀錄', icon: '📊' },
  { path: '/chat', label: 'AI 衛教', icon: '💬' },
];

const researcherTabs = [
  { path: '/researcher', label: '概覽', icon: '📊' },
  { path: '/lookup', label: '查詢', icon: '🔍' },
  { path: '/review', label: '審核', icon: '📝' },
];

export default function App() {
  const navigate = useNavigate();
  const {
    authState, isDemo, userInfo, loadingTooLong,
    handleLogin, handleLogout, syncSurgeryDate,
    setAuthState, setUserInfo,
  } = useAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Notification scheduler + SW message handler
  useEffect(() => {
    if (authState !== 'loggedIn') return;

    const checkReported = async () => {
      if (isDemo) return getLocalTodayReport() !== null;
      if (userInfo?.studyId) {
        const report = await sb.getTodayReport(userInfo.studyId);
        return report !== null;
      }
      return true;
    };

    startReminderScheduler(checkReported);

    const handleSWMessage = (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) navigate(event.data.url);
      if (event.data?.type === 'SW_UPDATED') setShowUpdateBanner(true);
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      stopReminderScheduler();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [authState, isDemo, userInfo, navigate]);

  const isResearcherRole = userInfo?.role === 'researcher' || userInfo?.role === 'pi';
  const tabs = isResearcherRole ? researcherTabs : patientTabs;

  const commonProps = {
    isDemo,
    userInfo,
    onLogout: () => handleLogout(navigate),
    onSyncSurgeryDate: syncSurgeryDate,
  };

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)', animation: 'pulse 1s infinite' }}>🏥</div>
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
          {loadingTooLong && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-sm)' }}>
                載入時間過長，可能是網路問題。
              </p>
              <button className="btn btn-secondary" style={{ marginBottom: 'var(--space-sm)' }}
                onClick={() => window.location.reload()}>重新整理</button>
              <br />
              <button className="btn btn-secondary" style={{ fontSize: 'var(--font-xs)', opacity: 0.7 }}
                onClick={async () => {
                  try { await signOut(); } catch {}
                  setUserInfo(null);
                  setAuthState('loggedOut');
                }}>回到登入頁</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authState === 'loggedOut') {
    return <Login onLogin={(info) => handleLogin(info, navigate)} />;
  }

  return (
    <>
      <OfflineBanner />
      <IOSInstallPrompt />
      <UpdateBanner show={showUpdateBanner} />
      <PageErrorBoundary>
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
        <Route path="/report" element={<SymptomReport onComplete={() => { setRefreshKey(k => k + 1); navigate('/'); }} {...commonProps} />} />
        <Route path="/history" element={<History key={refreshKey} {...commonProps} />} />
        <Route path="/chat" element={<AIChat {...commonProps} />} />
        <Route path="/survey" element={<UsabilitySurvey onComplete={() => { setRefreshKey(k => k + 1); navigate('/'); }} {...commonProps} />} />

        {/* Researcher routes */}
        <Route path="/researcher" element={
          <ResearcherDashboard key={refreshKey} onNavigate={(tab) => {
            navigate({ chatReview: '/review', lookup: '/lookup' }[tab] || '/researcher');
          }} {...commonProps} />
        } />
        <Route path="/lookup" element={<ResearcherPatientLookup onNavigate={(tab) => {
          navigate(tab === 'researcherDashboard' ? '/researcher' : '/lookup');
        }} {...commonProps} />} />
        <Route path="/review" element={<ChatReview onNavigate={(tab) => {
          navigate(tab === 'researcherDashboard' ? '/researcher' : '/review');
        }} {...commonProps} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </PageErrorBoundary>

      <nav className="bottom-nav">
        {tabs.map(tab => (
          <NavLink key={tab.path} to={tab.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={tab.path === '/' || tab.path === '/researcher'}>
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
        <button className="nav-item" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }}
          aria-label="切換主題">
          <span className="nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? '淺色' : '深色'}</span>
        </button>
      </nav>
    </>
  );
}
