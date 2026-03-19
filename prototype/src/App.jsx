import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from 'react-router-dom';
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
import { installGlobalErrorHandlers, initSentry } from './utils/errorLogger';
import { onAuthStateChange, getSession, getStudyId, getPatient, ensurePatient, getPODFromDate, signOut } from './utils/supabaseService';
import supabase from './utils/supabaseClient';
import { seedDemoData, getTodayReport as getLocalTodayReport } from './utils/storage';
import { startReminderScheduler, stopReminderScheduler } from './utils/notifications';
import * as sb from './utils/supabaseService';

// Initialize Sentry + global error handlers for production monitoring
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
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [authState, setAuthState] = useState('loading');
  const [isDemo, setIsDemo] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const loadingTimer = setTimeout(() => setLoadingTooLong(true), 8000);

    const checkAuth = async () => {
      try {
        // Step 1: get cached session — render immediately if exists
        const session = await getSession();
        if (!session) {
          setAuthState('loggedOut');
          return;
        }

        // Step 2: load user info with cached session FIRST (fast path)
        await loadUserInfo(session);
        setAuthState('loggedIn');

        // Step 3: server-verify in background (non-blocking)
        // If metadata changed, silently update userInfo
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const cachedStudyId = session.user?.user_metadata?.study_id;
            const freshStudyId = user.user_metadata?.study_id;
            if (freshStudyId && freshStudyId !== cachedStudyId) {
              console.warn('[checkAuth] Metadata drift detected, refreshing');
              const freshSession = { ...session, user: { ...session.user, user_metadata: user.user_metadata } };
              await loadUserInfo(freshSession);
            }
          }
        } catch (e) {
          console.warn('[checkAuth] Background verify failed (non-fatal):', e.message);
        }
      } catch (e) {
        console.error('[checkAuth] Fatal error:', e);
        setAuthState('loggedOut');
      } finally {
        clearTimeout(loadingTimer);
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
      if (event.data?.type === 'SW_UPDATED') {
        setShowUpdateBanner(true);
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

    console.info('[loadUserInfo] start', { studyId, role });

    if (studyId) {
      let patient = null;
      try {
        // Fast path: direct DB query (works for returning patients)
        patient = await getPatient(studyId);

        // Slow path: only call edge function if patient doesn't exist AND we have an invite token
        if (!patient && role === 'patient') {
          const inviteToken = sessionStorage.getItem('invite_token');
          if (inviteToken) {
            console.info('[loadUserInfo] patient not found, trying onboard edge function');
            patient = await ensurePatient(studyId, inviteToken);
            sessionStorage.removeItem('invite_token');
          }
        }
      } catch (e) {
        console.error('[loadUserInfo] patient fetch error:', e);
      }

      console.info('[loadUserInfo] done', { found: !!patient });

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
      try {
        await signOut();
      } catch (e) {
        console.error('[handleLogout] signOut failed:', e);
      }
      // Force state reset even if signOut threw
      setUserInfo(null);
      setAuthState('loggedOut');
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
          {loadingTooLong && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-sm)' }}>
                載入時間過長，可能是網路問題。
              </p>
              <button className="btn btn-secondary" style={{ marginBottom: 'var(--space-sm)' }}
                onClick={() => window.location.reload()}>
                重新整理
              </button>
              <br />
              <button className="btn btn-secondary" style={{ fontSize: 'var(--font-xs)', opacity: 0.7 }}
                onClick={async () => {
                  try { await signOut(); } catch {}
                  setUserInfo(null);
                  setAuthState('loggedOut');
                }}>
                回到登入頁
              </button>
            </div>
          )}
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
    <>      <OfflineBanner />
      <IOSInstallPrompt />
      {showUpdateBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--accent)', color: '#fff', textAlign: 'center',
          padding: '8px 16px', fontSize: 'var(--font-sm)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', gap: '8px',
        }}>
          <span>系統已更新</span>
          <button onClick={() => window.location.reload()} style={{
            background: '#fff', color: 'var(--accent)', border: 'none',
            borderRadius: '4px', padding: '2px 10px', fontSize: 'var(--font-xs)',
            cursor: 'pointer', fontWeight: 600,
          }}>重新載入</button>
        </div>
      )}
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
            const pathMap = { chatReview: '/review', lookup: '/lookup' };
            navigate(pathMap[tab] || '/researcher');
          }} {...commonProps} />
        } />
        <Route path="/lookup" element={<ResearcherPatientLookup onNavigate={(tab) => {
          navigate(tab === 'researcherDashboard' ? '/researcher' : '/lookup');
        }} {...commonProps} />} />
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
