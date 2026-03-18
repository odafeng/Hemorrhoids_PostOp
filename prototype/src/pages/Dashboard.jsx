import { useDashboardData } from '../utils/hooks';
import { checkAlerts } from '../utils/alerts';
import NotificationSetup from '../components/NotificationSetup';

export default function Dashboard({ onNavigate, isDemo, userInfo, onLogout }) {
  const { data, isLoading, error } = useDashboardData(isDemo, userInfo);

  const getPainColor = (pain) => {
    if (pain <= 3) return 'var(--success)';
    if (pain <= 6) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--danger)' }}>載入失敗：{error.message}</p>
      </div>
    );
  }

  const { pod, surgeryDate, todayReport, allReports, alerts, adherence, surveyDone } = data;

  const latestPain = allReports.length > 0
    ? (allReports[0]?.pain_nrs ?? allReports[0]?.pain ?? null)
    : null;

  // Normalize today report pain field
  const todayPain = todayReport?.pain_nrs ?? todayReport?.pain ?? null;
  const todayBleeding = todayReport?.bleeding;
  const todayBowel = todayReport?.bowel;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">術後追蹤</h1>
          <p className="page-subtitle">
            手術日期：{surgeryDate}
            {isDemo && <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>（Demo）</span>}
          </p>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-xs)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
        >
          登出
        </button>
      </div>

      {/* POD Counter */}
      <div className="card delay-1" style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 'var(--space-sm)',
        }}>術後天數</div>
        <div className="card-value" style={{ fontSize: '4rem', letterSpacing: '-2px' }}>{pod}</div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>POD {pod}</div>
      </div>

      {/* Survey prompt — show when POD >= 14 */}
      {pod >= 14 && !surveyDone && (
        <div className="card delay-1" style={{ borderColor: 'var(--accent)', borderWidth: '1.5px' }}>
          <div className="card-header">
            <div className="card-icon accent">📝</div>
            <div>
              <div className="card-title">系統可用性問卷</div>
              <span className="status-badge pending">● 待填寫</span>
            </div>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            您已使用系統超過 14 天，請花 1 分鐘填寫可用性問卷，幫助我們改善系統。
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('survey')}>
            填寫問卷
          </button>
        </div>
      )}
      {pod >= 14 && surveyDone && (
        <div className="card delay-1" style={{ opacity: 0.7 }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div className="card-icon success">📝</div>
            <div>
              <div className="card-title">系統可用性問卷</div>
              <span className="status-badge completed">✓ 已完成</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.map(alert => (
        <div key={alert.id} className={`alert-banner ${alert.type}`}>
          <span className="alert-icon">{alert.icon}</span>
          <div className="alert-content">
            <div className="alert-title">{alert.title}</div>
            <div className="alert-message">{alert.message}</div>
          </div>
        </div>
      ))}

      {/* Today's status */}
      <div className="card delay-2">
        <div className="card-header">
          <div className="card-icon accent">📋</div>
          <div>
            <div className="card-title">今日回報</div>
            {todayReport ? (
              <span className="status-badge completed">✓ 已完成</span>
            ) : (
              <span className="status-badge pending">● 待填寫</span>
            )}
          </div>
        </div>
        {!todayReport && (
          <button className="btn btn-primary" onClick={() => onNavigate('report')}>
            填寫今日症狀回報
          </button>
        )}
        {todayReport && (
          <div>
            <div className="symptom-row">
              <span className="symptom-name">疼痛分數</span>
              <span className="symptom-value" style={{ color: getPainColor(todayPain) }}>
                {todayPain}/10
              </span>
            </div>
            <div className="symptom-row">
              <span className="symptom-name">出血</span>
              <span className={`symptom-value ${todayBleeding === '持續' || todayBleeding === '血塊' ? 'danger' : ''}`}>
                {todayBleeding}
              </span>
            </div>
            <div className="symptom-row">
              <span className="symptom-name">排便</span>
              <span className={`symptom-value ${todayBowel === '未排' ? 'warning' : ''}`}>
                {todayBowel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <div className="card delay-3" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-icon cyan">📊</div>
            <div className="card-title" style={{ fontSize: 'var(--font-sm)' }}>回報率</div>
          </div>
          <div className="card-value" style={{ fontSize: 'var(--font-2xl)' }}>{adherence}%</div>
        </div>
        <div className="card delay-4" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: latestPain !== null ? `${getPainColor(latestPain)}20` : 'var(--accent-dim)' }}>
              {latestPain !== null && latestPain >= 7 ? '😣' : latestPain !== null && latestPain >= 4 ? '😐' : '😊'}
            </div>
            <div className="card-title" style={{ fontSize: 'var(--font-sm)' }}>最新疼痛</div>
          </div>
          <div className="card-value" style={{
            fontSize: 'var(--font-2xl)',
            color: latestPain !== null ? getPainColor(latestPain) : 'var(--text-muted)',
          }}>
            {latestPain !== null ? `${latestPain}/10` : '—'}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card delay-5" style={{ marginTop: 'var(--space-md)' }}>
        <div className="card-header">
          <div className="card-icon success">💡</div>
          <div className="card-title">快捷功能</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onNavigate('history')}>📊 查看紀錄</button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onNavigate('chat')}>💬 AI 衛教</button>
        </div>
      </div>

      {/* Notification Settings */}
      <NotificationSetup />
    </div>
  );
}
