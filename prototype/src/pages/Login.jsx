import { useState } from 'react';
import { signIn, signUp } from '../utils/supabaseService';

const VALID_INVITE_CODE = import.meta.env.VITE_INVITE_CODE || 'HEMORRHOID2026';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'demo'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studyId, setStudyId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (inviteCode.trim().toUpperCase() !== VALID_INVITE_CODE.toUpperCase()) {
          throw new Error('邀請碼不正確，請向研究團隊索取。');
        }
        await signUp(email, password, {
          role: 'patient',
          study_id: studyId,
          surgery_date: surgeryDate || new Date().toISOString().split('T')[0],
        });
        setError('');
        setMode('login');
        alert('帳號建立成功！請登入。');
      } else {
        await signIn(email, password);
        // onLogin will be triggered via onAuthStateChange in App
      }
    } catch (err) {
      setError(err.message || '登入失敗，請檢查帳號密碼');
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
            {/* Tab Switch */}
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
                {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
              </button>
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
