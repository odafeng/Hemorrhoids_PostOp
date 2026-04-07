import { useState } from 'react';
import * as sb from '../utils/supabaseService';

export default function ResearcherPatientLookup({ onNavigate, isDemo, userInfo, onLogout }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    const studyId = query.trim();
    if (!studyId) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (isDemo) {
        setResult({ demo: true, studyId });
        return;
      }

      // Parallel fetch: patient, reports, alerts
      const [patient, reports, alerts] = await Promise.all([
        sb.getPatient(studyId),
        sb.getAllReports(studyId),
        sb.getAlerts(studyId),
      ]);

      const today = new Date().toLocaleDateString('en-CA');
      const todayReport = reports.find(r => r.report_date === today) || null;
      const activeAlerts = alerts.filter(a => !a.acknowledged);
      const latestReport = reports.length > 0 ? reports[0] : null;

      let pod = null;
      if (patient?.surgery_date) {
        pod = sb.getPODFromDate(patient.surgery_date);
      }

      setResult({
        studyId,
        patientExists: !!patient,
        patient,
        pod,
        totalReports: reports.length,
        latestReportDate: latestReport?.report_date || null,
        latestReportPain: latestReport?.pain_nrs ?? null,
        todayReported: !!todayReport,
        activeAlerts: activeAlerts.length,
        alertDetails: activeAlerts,
      });
    } catch (err) {
      setError(err.message || '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  const Row = ({ label, value, warn }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>{label}</span>
      <span style={{
        color: warn ? 'var(--danger)' : 'var(--text-primary)',
        fontWeight: warn ? 600 : 400,
        fontSize: 'var(--font-sm)',
        fontFamily: 'monospace',
      }}>
        {String(value)}
      </span>
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">病人查詢</h1>
          <p className="page-subtitle">Patient Lookup</p>
        </div>
        <button
          onClick={() => onNavigate('researcherDashboard')}
          style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
            fontSize: 'var(--font-xs)', padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
        >
          ← 返回
        </button>
      </div>

      {/* Search */}
      <div className="card delay-1">
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            className="chat-input"
            style={{ flex: 1 }}
            placeholder="輸入 Study ID（例如 HEM-001）"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '...' : '查詢'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-banner danger">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-message">{error}</div>
          </div>
        </div>
      )}

      {/* Demo placeholder */}
      {result?.demo && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            Demo 模式不支援即時查詢
          </p>
        </div>
      )}

      {/* Results */}
      {result && !result.demo && (
        <>
          {/* Status overview */}
          <div className="card delay-2">
            <div className="card-header">
              <div className="card-icon accent">🔍</div>
              <div className="card-title">{result.studyId}</div>
            </div>

            <Row label="Patient record" value={result.patientExists ? '✓ exists' : '✗ NOT FOUND'} warn={!result.patientExists} />

            {result.patientExists && (
              <>
                <Row label="Study status" value={result.patient.study_status || '(null)'} />
                <Row label="Surgery date" value={result.patient.surgery_date || '(null)'} warn={!result.patient.surgery_date} />
                <Row label="Surgery type" value={result.patient.surgery_type || '(not set)'} />
                <Row label="POD" value={result.pod ?? '(unknown)'} />
                <Row label="Total reports" value={result.totalReports} warn={result.totalReports === 0} />
                <Row label="Latest report" value={result.latestReportDate || '(none)'} />
                <Row label="Latest pain NRS" value={result.latestReportPain ?? '(none)'} />
                <Row label="Today reported" value={result.todayReported ? '✓ yes' : '✗ no'} warn={!result.todayReported} />
                <Row label="Active alerts" value={result.activeAlerts} warn={result.activeAlerts > 0} />
              </>
            )}
          </div>

          {/* Active alerts detail */}
          {result.alertDetails?.length > 0 && (
            <div className="card delay-3">
              <div className="card-header">
                <div className="card-icon danger">🚨</div>
                <div className="card-title">未處理警示</div>
              </div>
              {result.alertDetails.map(a => (
                <div key={a.id} className={`alert-banner ${a.alert_level}`} style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="alert-icon">{a.alert_level === 'danger' ? '🔴' : '🟡'}</span>
                  <div className="alert-content">
                    <div className="alert-title">{a.alert_type}</div>
                    <div className="alert-message">{a.message}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {a.triggered_at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Password Reset Tool */}
      {!isDemo && (
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="card-header">
            <div className="card-icon warning">🔑</div>
            <div className="card-title">重設病人密碼</div>
          </div>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
            當病人忘記密碼時，研究人員可在此直接重設。
          </p>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 'var(--font-xs)' }}>病人電子郵件</label>
            <input
              className="chat-input"
              style={{ width: '100%' }}
              type="email"
              placeholder="patient@example.com"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 'var(--font-xs)' }}>新密碼（至少 6 字元）</label>
            <input
              className="chat-input"
              style={{ width: '100%' }}
              type="text"
              placeholder="輸入新密碼"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={resetLoading || !resetEmail.trim() || resetPassword.length < 6}
            onClick={async () => {
              setResetLoading(true);
              setResetMsg('');
              try {
                await sb.adminResetPassword(resetEmail.trim(), resetPassword);
                setResetMsg('✓ 密碼重設成功');
                setResetPassword('');
              } catch (err) {
                setResetMsg('✗ ' + (err.message || '重設失敗'));
              } finally {
                setResetLoading(false);
              }
            }}
          >
            {resetLoading ? '處理中...' : '重設密碼'}
          </button>
          {resetMsg && (
            <div style={{
              marginTop: 'var(--space-sm)', fontSize: 'var(--font-xs)', textAlign: 'center',
              color: resetMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
            }}>
              {resetMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
