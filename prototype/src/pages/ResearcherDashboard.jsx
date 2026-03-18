import { useState, useEffect } from 'react';
import { getResearcherMockData } from '../utils/storage';
import * as sb from '../utils/supabaseService';

export default function ResearcherDashboard({ onNavigate, isDemo, userInfo, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [adherence, setAdherence] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  useEffect(() => {
    loadData();
  }, [isDemo]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        const mock = getResearcherMockData();
        setPatients(mock.patients);
        setAdherence(mock.adherence);
        setAlerts(mock.alerts);
        setUnreviewedCount(mock.chatLogs.filter(c => !c.reviewed).length);
      } else {
        const [pts, adh, alts, chats] = await Promise.all([
          sb.getAllPatients(),
          sb.getAdherenceSummary(),
          sb.getAllAlertsForResearcher(),
          sb.getUnreviewedChats(),
        ]);
        setPatients(pts);
        setAdherence(adh);
        setAlerts(alts);
        setUnreviewedCount(chats.length);
      }
    } catch (err) {
      console.error('Researcher data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const activePatients = patients.filter(p => p.study_status === 'active').length;
  const avgAdherence = adherence.length > 0
    ? (adherence.reduce((sum, a) => sum + Number(a.adherence_pct), 0) / adherence.length).toFixed(1)
    : 0;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;

  // Merge patients with adherence
  const patientRows = patients.map(p => {
    const adh = adherence.find(a => a.study_id === p.study_id) || {};
    return { ...p, ...adh };
  });

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>載入中...</p>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">研究者儀表板</h1>
          <p className="page-subtitle">
            {userInfo?.role === 'pi' ? '主持人' : '研究團隊'}
            {isDemo && <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>（Demo）</span>}
          </p>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
            fontSize: 'var(--font-xs)', padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
        >
          登出
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card stat-card delay-1">
          <div className="stat-label">收案人數</div>
          <div className="stat-value accent">{activePatients}</div>
          <div className="stat-sub">Active / {patients.length} Total</div>
        </div>
        <div className="card stat-card delay-2">
          <div className="stat-label">平均依從率</div>
          <div className="stat-value" style={{ color: avgAdherence >= 70 ? 'var(--success)' : 'var(--warning)' }}>
            {avgAdherence}%
          </div>
          <div className="stat-sub">目標 ≥ 70%</div>
        </div>
        <div className="card stat-card delay-3">
          <div className="stat-label">活躍警示</div>
          <div className="stat-value" style={{ color: activeAlerts > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {activeAlerts}
          </div>
          <div className="stat-sub">未處理</div>
        </div>
        <div className="card stat-card delay-4">
          <div className="stat-label">待審核 AI</div>
          <div className="stat-value" style={{ color: unreviewedCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {unreviewedCount}
          </div>
          <div className="stat-sub">則對話</div>
        </div>
      </div>

      {/* Review AI Button */}
      {unreviewedCount > 0 && (
        <button className="btn btn-primary delay-5" onClick={() => onNavigate('chatReview')}
          style={{ marginBottom: 'var(--space-lg)' }}
        >
          🔍 審核 AI 回覆（{unreviewedCount} 則待審）
        </button>
      )}

      {/* Patient Table */}
      <div className="card delay-5" style={{ padding: 'var(--space-md)' }}>
        <div className="card-header">
          <div className="card-icon cyan">📋</div>
          <div className="card-title">病人列表</div>
        </div>

        <div className="r-table-wrap">
          <table className="r-table">
            <thead>
              <tr>
                <th>Study ID</th>
                <th>術式</th>
                <th>POD</th>
                <th>回報</th>
                <th>依從率</th>
                <th>Avg Pain</th>
                <th>警示</th>
              </tr>
            </thead>
            <tbody>
              {patientRows.map(row => {
                const pod = row.surgery_date
                  ? Math.max(0, Math.floor((new Date() - new Date(row.surgery_date)) / 86400000))
                  : '-';
                return (
                  <tr key={row.study_id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{row.study_id}</td>
                    <td>{row.surgery_type === 'stapled hemorrhoidopexy' ? 'Stapled' : 'Open'}</td>
                    <td>{pod}</td>
                    <td>{row.total_reports ?? 0}</td>
                    <td style={{
                      color: (row.adherence_pct ?? 0) >= 70 ? 'var(--success)' : 'var(--warning)',
                      fontWeight: 500,
                    }}>
                      {row.adherence_pct ?? 0}%
                    </td>
                    <td>{row.avg_pain ?? '-'}</td>
                    <td>{row.had_alerts ? '⚠️' : '✓'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert History */}
      {alerts.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <div className="card-header">
            <div className="card-icon danger">🚨</div>
            <div className="card-title">警示紀錄</div>
          </div>
          {alerts.map(a => (
            <div key={a.id} className={`alert-banner ${a.alert_level}`} style={{ marginBottom: 'var(--space-sm)' }}>
              <span className="alert-icon">{a.alert_level === 'danger' ? '🔴' : '🟡'}</span>
              <div className="alert-content">
                <div className="alert-title">{a.study_id} — {a.alert_type}</div>
                <div className="alert-message">{a.message}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {a.triggered_at} {a.acknowledged ? '(已確認)' : '(未確認)'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
