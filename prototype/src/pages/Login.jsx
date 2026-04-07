import { useState, useEffect } from 'react';
import { signIn, signUp, resetPassword } from '../utils/supabaseService';

const SAVED_EMAIL_KEY = 'saved_login_email';
const REMEMBER_KEY = 'remember_login';

// Supabase error messages → 中文翻譯
const ERROR_MAP = {
  'Invalid login credentials': '帳號或密碼錯誤，請重新輸入',
  'Email not confirmed': '電子郵件尚未驗證，請查看信箱',
  'User already registered': '此電子郵件已註冊，請直接登入',
  'Password should be at least 6 characters': '密碼至少需要 6 個字元',
  'Unable to validate email address: invalid format': '電子郵件格式不正確',
  'Signup requires a valid password': '請輸入有效的密碼',
  'User not found': '查無此帳號，請確認電子郵件是否正確',
  'Email rate limit exceeded': '請求過於頻繁，請稍後再試',
  'For security purposes, you can only request this after': '操作過於頻繁，請稍後再試',
};

function translateError(msg) {
  if (!msg) return '登入失敗，請檢查帳號密碼';
  // If message is already Chinese (contains CJK characters), return as-is
  if (/[\u4e00-\u9fff]/.test(msg)) return msg;
  for (const [en, zh] of Object.entries(ERROR_MAP)) {
    if (msg.includes(en)) return zh;
  }
  return '登入失敗，請檢查帳號密碼';
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studyId, setStudyId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBER_KEY) === 'true');

  // Load saved email on mount
  useEffect(() => {
    if (rememberMe) {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      if (saved) setEmail(saved);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) throw new Error('請輸入電子郵件');
        await resetPassword(email.trim());
        setResetSent(true);
      } else if (mode === 'register') {
        // Basic client-side check (real validation happens server-side in patient-onboard)
        if (!inviteCode.trim()) {
          throw new Error('請輸入邀請碼。');
        }
        // Store invite token for patient-onboard Edge Function to verify
        sessionStorage.setItem('invite_token', inviteCode.trim());
        await signUp(email, password, {
          role: 'patient',
          study_id: studyId,
          surgery_date: surgeryDate || new Date().toLocaleDateString('en-CA'),
        });
        setError('');
        setMode('login');
        alert('帳號建立成功！請登入。');
      } else {
        await signIn(email, password);
        // Save email if "remember me" is checked
        if (rememberMe) {
          localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
          localStorage.setItem(REMEMBER_KEY, 'true');
        } else {
          localStorage.removeItem(SAVED_EMAIL_KEY);
          localStorage.removeItem(REMEMBER_KEY);
        }
        // onLogin will be triggered via onAuthStateChange in App
      }
    } catch (err) {
      setError(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    onLogin({ demo: true, studyId: 'DEMO-001' });
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', padding: 'var(--space-xl)' }}>
      {/* Logo / Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🏥</div>
        <h1 className="page-title" style={{ fontSize: 'var(--font-xl)', marginBottom: 'var(--space-xs)' }}>
          術後追蹤系統
        </h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          痔瘡手術術後症狀監測與 AI 衛教
        </p>
      </div>

      {/* Login Card */}
      <div className="card" style={{ animationDelay: '0.1s' }}>
        {mode !== 'demo' && (
          <>
            {/* Tab Switch — hide in forgot mode */}
            {mode !== 'forgot' && (
              <div style={{ display: 'flex', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <button
                  className={`toggle-btn ${mode === 'login' ? 'selected' : ''}`}
                  onClick={() => { setMode('login'); setError(''); }}
                >
                  登入
                </button>
                <button
                  className={`toggle-btn ${mode === 'register' ? 'selected' : ''}`}
                  onClick={() => { setMode('register'); setError(''); }}
                >
                  註冊
                </button>
              </div>
            )}
            {mode === 'forgot' && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  重設密碼
                </div>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                  輸入您的電子郵件，我們會寄送重設連結。
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                <div className="form-group">
                  <label className="form-label">邀請碼 <span>(Invite Code)</span></label>
                  <input
                    className="chat-input"
                    style={{ width: '100%' }}
                    placeholder="請輸入研究團隊提供的邀請碼"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">手術日期</label>
                  <input
                    className="chat-input"
                    style={{ width: '100%' }}
                    type="date"
                    value={surgeryDate}
                    onChange={e => setSurgeryDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">研究編號 <span>(Study ID)</span></label>
                  <input
                    className="chat-input"
                    style={{ width: '100%' }}
                    placeholder="例如：HEM-001"
                    value={studyId}
                    onChange={e => setStudyId(e.target.value)}
                    required
                  />
                </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">電子郵件</label>
                <input
                  className="chat-input"
                  style={{ width: '100%' }}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {mode !== 'forgot' && (
                <div className="form-group">
                  <label className="form-label">密碼</label>
                  <input
                    className="chat-input"
                    style={{ width: '100%' }}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}

              {mode === 'login' && (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-md)', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      if (!e.target.checked) {
                        localStorage.removeItem(SAVED_EMAIL_KEY);
                        localStorage.removeItem(REMEMBER_KEY);
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    記住我的帳號
                  </span>
                </label>
              )}

              {error && (
                <div className="alert-banner danger" style={{ marginBottom: 'var(--space-md)' }}>
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">
                    <div className="alert-message">{error}</div>
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? '處理中...' : mode === 'login' ? '登入' : mode === 'forgot' ? '發送重設連結' : '建立帳號'}
              </button>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setResetSent(false); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    fontSize: 'var(--font-xs)', cursor: 'pointer', marginTop: 'var(--space-sm)',
                    textDecoration: 'underline', width: '100%',
                  }}
                >
                  忘記密碼？
                </button>
              )}

              {mode === 'forgot' && resetSent && (
                <div style={{ color: 'var(--success)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                  ✓ 重設連結已寄出，請查看您的信箱。
                </div>
              )}

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: 'var(--font-xs)', cursor: 'pointer', marginTop: 'var(--space-sm)',
                    width: '100%',
                  }}
                >
                  ← 返回登入
                </button>
              )}
            </form>
          </>
        )}
      </div>

      {/* Demo Mode Buttons */}
      <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={handleDemo}
          style={{ maxWidth: '280px', margin: '0 auto' }}
        >
          🧪 Demo 模式（無需登入）
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onLogin({ demo: true, studyId: 'RESEARCHER', role: 'researcher' })}
          style={{ maxWidth: '280px', margin: 'var(--space-sm) auto 0', background: 'var(--accent-dim)', borderColor: 'var(--accent)' }}
        >
          🔬 研究者 Demo
        </button>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
          Demo 模式使用本機資料，不連線 Supabase
        </p>
      </div>
    </div>
  );
}
