import { useState, useEffect } from 'react';
import { getResearcherMockData } from '../utils/storage';
import * as sb from '../utils/supabaseService';
import ResearcherCharts from '../components/ResearcherCharts';
import { downloadCSV, downloadJSON } from '../utils/csvExport';

export default function ResearcherDashboard({ onNavigate, isDemo, userInfo, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [adherence, setAdherence] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [ackingId, setAckingId] = useState(null);
  const [allReports, setAllReports] = useState([]);

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
        setAllReports(mock.reports || []);
      } else {
        const [pts, adh, alts, chats, reports] = await Promise.all([
          sb.getAllPatients(),
          sb.getAdherenceSummary(),
          sb.getAllAlertsForResearcher(),
          sb.getUnreviewedChats(),
          sb.getAllReportsForResearcher(),
        ]);
        setPatients(pts);
        setAdherence(adh);
        setAlerts(alts);
        setUnreviewedCount(chats.length);
        setAllReports(reports);
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

  const handleAcknowledge = async (alertId) => {
    if (isDemo) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
      return;
    }
    setAckingId(alertId);
    try {
      await sb.acknowledgeAlert(alertId, userInfo?.studyId || 'researcher');
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    } catch (err) {
      console.error('Acknowledge error:', err);
    } finally {
      setAckingId(null);
    }
  };

  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const today = new Date().toLocaleDateString('en-CA');

  const handleExportCSV = async () => {
    setExporting(true);
    setExportType('reports');
    try {
      const reports = isDemo ? allReports : await sb.getAllReportsForResearcher();
      downloadCSV(reports,
        ['study_id', 'report_date', 'pod', 'pain_nrs', 'bleeding', 'bowel', 'fever', 'wound', 'urinary', 'continence', 'report_source', 'reported_at'],
        `symptom_reports_${today}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      alert('匯出失敗：' + err.message);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const handleExportAlerts = async () => {
    setExporting(true);
    setExportType('alerts');
    try {
      const data = isDemo ? alerts : await sb.getAllAlertsForResearcher();
      downloadCSV(data,
        ['id', 'study_id', 'alert_type', 'alert_level', 'message', 'triggered_at', 'acknowledged', 'acknowledged_by', 'acknowledged_at'],
        `alerts_${today}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      alert('匯出失敗：' + err.message);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const handleExportChats = async () => {
    setExporting(true);
    setExportType('chats');
    try {
      const data = isDemo ? [] : await sb.getAllChatsForResearcher();
      downloadCSV(data,
        ['id', 'study_id', 'user_message', 'ai_response', 'matched_topic', 'reviewed', 'review_result', 'review_notes', 'created_at'],
        `ai_chat_logs_${today}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      alert('匯出失敗：' + err.message);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const handleFullBackup = async () => {
    setExporting(true);
    setExportType('backup');
    try {
      let data;
      if (isDemo) {
        const mock = getResearcherMockData();
        data = { patients: mock.patients, symptom_reports: mock.reports, alerts: mock.alerts, ai_chat_logs: mock.chatLogs };
      } else {
        const [reports, alertData, chats, pts] = await Promise.all([
          sb.getAllReportsForResearcher(),
          sb.getAllAlertsForResearcher(),
          sb.getAllChatsForResearcher(),
          sb.getAllPatients(),
        ]);
        data = { patients: pts, symptom_reports: reports, alerts: alertData, ai_chat_logs: chats };
      }
      downloadJSON(data, `full_backup_${today}.json`);
    } catch (err) {
      console.error('Backup error:', err);
      alert('備份失敗：' + err.message);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <img src="/KSVGH.png" alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%' }} />
          <div>
            <h1 className="page-title" style={{ fontSize: 'var(--font-base)' }}>研究者儀表板</h1>
            <p className="page-subtitle" style={{ fontSize: 'var(--font-xs)' }}>
              {userInfo?.role === 'pi' ? '主持人' : '研究團隊'}
              {isDemo && <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>（Demo）</span>}
            </p>
          </div>
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

      {/* Review AI Button — always visible */}
      <button
        className={`btn ${unreviewedCount > 0 ? 'btn-primary' : 'btn-secondary'} delay-5`}
        onClick={() => onNavigate('chatReview')}
        style={{ marginBottom: 'var(--space-sm)', width: '100%' }}
      >
        {unreviewedCount > 0
          ? `🔍 審核 AI 回覆（${unreviewedCount} 則待審）`
          : '🔍 AI 回覆審核紀錄'}
      </button>

      {/* Export Buttons */}
      <div className="card delay-5" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <div className="card-header">
          <div className="card-icon success">📥</div>
          <div className="card-title">資料匯出</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}
            disabled={exporting} style={{ width: '100%' }}>
            {exportType === 'reports' ? '匯出中...' : '📋 症狀回報 CSV'}
          </button>
          <button className="btn btn-secondary" onClick={handleExportAlerts}
            disabled={exporting} style={{ width: '100%' }}>
            {exportType === 'alerts' ? '匯出中...' : '🚨 警示紀錄 CSV'}
          </button>
          <button className="btn btn-secondary" onClick={handleExportChats}
            disabled={exporting} style={{ width: '100%' }}>
            {exportType === 'chats' ? '匯出中...' : '💬 AI 對話紀錄 CSV'}
          </button>
          <button className="btn btn-primary" onClick={handleFullBackup}
            disabled={exporting} style={{ width: '100%' }}>
            {exportType === 'backup' ? '備份中...' : '💾 全量資料備份 (JSON)'}
          </button>
        </div>
      </div>

      {/* Charts */}
      {allReports.length > 0 && (
        <ResearcherCharts reports={allReports} patients={patients} adherence={adherence} />
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
                const podNum = row.surgery_date
                  ? Math.max(0, Math.floor((new Date() - new Date(row.surgery_date)) / 86400000))
                  : null;
                const podLabel = podNum === null ? '-' : podNum === 0 ? 'OP' : podNum;
                return (
                  <tr key={row.study_id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{row.study_id}</td>
                    <td>{row.surgery_type === 'stapled hemorrhoidopexy' ? 'Stapled' : 'Open'}</td>
                    <td>{podLabel}</td>
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
            <div key={a.id} className={`alert-banner ${a.alert_level}`} style={{ marginBottom: 'var(--space-sm)', position: 'relative' }}>
              <span className="alert-icon">{a.alert_level === 'danger' ? '🔴' : '🟡'}</span>
              <div className="alert-content" style={{ flex: 1 }}>
                <div className="alert-title">{a.study_id} — {a.alert_type}</div>
                <div className="alert-message">{a.message}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {a.triggered_at} {a.acknowledged ? '(已確認)' : '(未確認)'}
                </div>
              </div>
              {!a.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(a.id)}
                  disabled={ackingId === a.id}
                  style={{
                    background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--success)',
                    fontSize: '0.65rem', padding: '3px 8px', cursor: 'pointer',
                    whiteSpace: 'nowrap', alignSelf: 'center',
                  }}
                >
                  {ackingId === a.id ? '...' : '✓ 確認'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
