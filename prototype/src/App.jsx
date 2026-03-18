import { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SymptomReport from './pages/SymptomReport';
import History from './pages/History';
import AIChat from './pages/AIChat';
import { onAuthStateChange, getSession, getStudyId, getPatient, getPODFromDate, signOut } from './utils/supabaseService';
import { seedDemoData } from './utils/storage';

const tabs = [
  { id: 'dashboard', label: '首頁', icon: '🏠' },
  { id: 'report', label: '回報', icon: '📋' },
  { id: 'history', label: '紀錄', icon: '📊' },
  { id: 'chat', label: 'AI 衛教', icon: '💬' },
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

  const loadUserInfo = async (session) => {
    const studyId = session?.user?.user_metadata?.study_id;
    const role = session?.user?.user_metadata?.role || 'patient';
    if (studyId) {
      const patient = await getPatient(studyId);
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
      // Demo mode — use LocalStorage
      setIsDemo(true);
      seedDemoData();
      setUserInfo({ studyId: 'DEMO-001', role: 'patient', surgeryDate: null, pod: 0 });
      setAuthState('loggedIn');
    }
    // For Supabase login, onAuthStateChange will handle it
  };

  const handleLogout = async () => {
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
      default:
        return <Dashboard key={refreshKey} onNavigate={setActiveTab} {...commonProps} />;
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
