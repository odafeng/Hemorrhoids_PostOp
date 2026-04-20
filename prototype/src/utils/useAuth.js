// Auth hook — encapsulates all auth state, session check, login/logout
import { useState, useEffect } from 'react';
import { onAuthStateChange, getSession, ensurePatient, getPatient, getPODFromDate, signOut } from './supabaseService';
import supabase from './supabaseClient';
import { seedDemoData } from './storage';

export function useAuth() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'loggedIn' | 'loggedOut'
  const [isDemo, setIsDemo] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  const loadUserInfo = async (session) => {
    const id = session?.user?.id || null;
    const email = session?.user?.email || null;
    const studyId = session?.user?.user_metadata?.study_id;
    const role = session?.user?.user_metadata?.role || 'patient';
    const surgeryDate = session?.user?.user_metadata?.surgery_date || null;

    console.info('[loadUserInfo]', { id, studyId, role, surgeryDate });

    if (studyId) {
      setUserInfo({
        id,
        email,
        studyId,
        role,
        surgeryDate,
        pod: surgeryDate ? getPODFromDate(surgeryDate) : 0,
      });

      // Fire-and-forget: onboard new patient if invite token exists
      const inviteToken = sessionStorage.getItem('invite_token');
      if (inviteToken && role === 'patient') {
        sessionStorage.removeItem('invite_token');
        ensurePatient(studyId, inviteToken).catch(e =>
          console.error('[loadUserInfo] onboard failed:', e)
        );
      }
    }
  };

  // Check auth on mount
  useEffect(() => {
    const loadingTimer = setTimeout(() => setLoadingTooLong(true), 8000);

    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          setAuthState('loggedOut');
          return;
        }

        await loadUserInfo(session);
        setAuthState('loggedIn');

        // Background server-verify
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

  const handleLogin = (info, navigate) => {
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

  const handleLogout = async (navigate) => {
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
      setUserInfo(null);
      setAuthState('loggedOut');
    }
    navigate('/');
  };

  const syncSurgeryDate = (dbSurgeryDate) => {
    if (dbSurgeryDate && dbSurgeryDate !== userInfo?.surgeryDate) {
      setUserInfo(prev => prev ? {
        ...prev,
        surgeryDate: dbSurgeryDate,
        pod: getPODFromDate(dbSurgeryDate),
      } : prev);
    }
  };

  return {
    authState, isDemo, userInfo, loadingTooLong,
    handleLogin, handleLogout, syncSurgeryDate,
    setAuthState, setUserInfo,
  };
}
