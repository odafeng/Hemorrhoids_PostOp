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

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Step 1: get cached session (needed for token)
      const session = await getSession();
      if (!session) {
        setAuthState('loggedOut');
        return;
      }

      // Step 2: try server-verify with timeout (prevents PWA from hanging)
      let freshUser = null;
      try {
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getUser timeout')), 5000)
        );
        const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]);
        if (!error && user) {
          freshUser = user;
        }
      } catch (e) {
        console.warn('[checkAuth] Server verification failed or timed out:', e.message);
      }

      if (freshUser) {
        // Server-verified: use fresh metadata
        const freshSession = {
          ...session,
          user: { ...session.user, user_metadata: freshUser.user_metadata },
        };
        await loadUserInfo(freshSession);
      } else {
        // Fallback: use cached session (better than stuck on loading)
        console.warn('[checkAuth] Using cached session as fallback');
        await loadUserInfo(session);
      }
      setAuthState('loggedIn');
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

    if (import.meta.env.DEV) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      console.info('[loadUserInfo]', {
        context: isStandalone ? 'PWA' : 'browser',
        email: session?.user?.email,
        userId: session?.user?.id,
        studyId,
        role,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : '(none)',
      });
    }

    if (studyId) {
      let patient;
      if (role === 'patient') {
        // Read invite token stored during registration (if any)
        const inviteToken = sessionStorage.getItem('invite_token');
        patient = await ensurePatient(studyId, inviteToken);
        // Clear after use — token is single-use
        if (inviteToken) sessionStorage.removeItem('invite_token');
      } else {
        patient = await getPatient(studyId);
      }
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
