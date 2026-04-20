import { useState } from 'react';
import * as sb from '../utils/supabaseService';
import * as I from '../components/Icons';

export default function ResearcherPatientLookup({ onNavigate, isDemo }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    const studyId = query.trim();
    if (!studyId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      if (isDemo) {
        setResult({ demo: true, studyId });
        return;
      }
      const [patient, reports, alerts] = await Promise.all([
        sb.getPatient(studyId),
        sb.getAllReports(studyId),
        sb.getAlerts(studyId),
      ]);
      const today = new Date().toLocaleDateString('en-CA');
      const todayReport = reports.find(r => r.report_date === today) || null;
      const activeAlerts = alerts.filter(a => !a.acknowledged);
      const latestReport = reports.length > 0 ? reports[0] : null;
      const pod = patient?.surgery_date ? sb.getPODFromDate(patient.surgery_date) : null;
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

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => onNavigate('researcherDashboard')} aria-label="返回">
          <I.ArrowLeft width={17} height={17} />
        </button>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          PATIENT LOOKUP
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-head">
        <div className="eyebrow">RESEARCHER TOOLS</div>
        <h1 className="page-title">病人查詢</h1>
        <p className="page-sub">輸入 Study ID 查詢病人資料與警示狀況</p>
      </div>

      <form onSubmit={handleLookup}>
        <div className="search-box">
          <I.Search width={14} height={14} />
          <input placeholder="搜尋病人編號 · e.g. HSF-003"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '查詢中…' : <>查詢 <I.Chevron width={14} height={14} /></>}
        </button>
      </form>

      {error && (
        <div className="alert-banner danger" style={{ marginTop: 12 }}>
          <div className="al-icon"><I.Alert width={18} height={18} /></div>
          <div><div className="al-msg">{error}</div></div>
        </div>
      )}

      {result?.demo && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--ink-3)', textAlign: 'center', fontSize: 12.5 }}>
            Demo 模式不支援即時查詢
          </p>
        </div>
      )}

      {result && !result.demo && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="eyebrow small">CASE DETAIL</div>
            <div className="case-head">
              <div className="case-id">{result.studyId}</div>
              <div className={`chip chip-${result.activeAlerts > 0 ? 'danger' : result.patientExists ? 'ok' : 'warn'}`}>
                {!result.patientExists ? '未建檔' : result.activeAlerts > 0 ? '警示' : '穩定'}
              </div>
            </div>
            {result.patientExists && (
              <div className="case-grid">
                <div>
                  <div className="case-k">Study Status</div>
                  <div className="case-v">{result.patient.study_status || '—'}</div>
                </div>
                <div>
                  <div className="case-k">Surgery Date</div>
                  <div className="case-v">{result.patient.surgery_date || '—'}</div>
                </div>
                <div>
                  <div className="case-k">POD</div>
                  <div className="case-v">{result.pod ?? '—'}</div>
                </div>
                <div>
                  <div className="case-k">術式</div>
                  <div className="case-v">{result.patient.surgery_type || '—'}</div>
                </div>
                <div>
                  <div className="case-k">Total Reports</div>
                  <div className="case-v">{result.totalReports}</div>
                </div>
                <div>
                  <div className="case-k">Latest NRS</div>
                  <div className="case-v">{result.latestReportPain ?? '—'}</div>
                </div>
                <div>
                  <div className="case-k">Today</div>
                  <div className="case-v">{result.todayReported ? '✓ 已回報' : '✗ 未回報'}</div>
                </div>
                <div>
                  <div className="case-k">Active Alerts</div>
                  <div className="case-v" style={{ color: result.activeAlerts > 0 ? 'var(--danger)' : undefined }}>
                    {result.activeAlerts}
                  </div>
                </div>
              </div>
            )}
          </div>

          {result.alertDetails?.length > 0 && (
            <>
              <div className="card-kicker" style={{ margin: '14px 4px 10px' }}>UNACKED ALERTS</div>
              {result.alertDetails.map(a => (
                <div key={a.id} className={`alert-banner ${a.alert_level === 'danger' ? 'danger' : ''}`}>
                  <div className="al-icon"><I.Alert width={18} height={18} /></div>
                  <div>
                    <div className="al-title">{a.alert_type}</div>
                    <div className="al-msg">{a.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      {a.triggered_at}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {!isDemo && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <div className="card-head-left">
              <div className="card-icon warn"><I.Shield width={14} height={14} /></div>
              <div>
                <div className="card-kicker">Admin Tool</div>
                <div className="card-title">重設病人密碼</div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.55 }}>
            當病人忘記密碼時，研究人員可在此直接重設。
          </p>
          <div className="input-group">
            <label className="input-lbl">病人電子郵件</label>
            <input className="input" type="email" placeholder="patient@example.com"
              value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-lbl">新密碼 <span style={{ color: 'var(--ink-3)', textTransform: 'none', letterSpacing: 0 }}>(至少 6 字元)</span></label>
            <div className="input-password-wrap">
              <input className="input"
                type={showResetPwd ? 'text' : 'password'}
                placeholder="輸入新密碼"
                value={resetPwd}
                onChange={e => setResetPwd(e.target.value)}
                minLength={6} />
              <button type="button" className="input-eye"
                onClick={() => setShowResetPwd(v => !v)}
                aria-label={showResetPwd ? '隱藏密碼' : '顯示密碼'}
                tabIndex={-1}>
                {showResetPwd ? <I.EyeOff width={18} height={18} /> : <I.Eye width={18} height={18} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary"
            disabled={resetLoading || !resetEmail.trim() || resetPwd.length < 6}
            onClick={async () => {
              setResetLoading(true); setResetMsg('');
              try {
                await sb.adminResetPassword(resetEmail.trim(), resetPwd);
                setResetMsg('✓ 密碼重設成功');
                setResetPwd('');
              } catch (err) {
                setResetMsg('✗ ' + (err.message || '重設失敗'));
              } finally {
                setResetLoading(false);
              }
            }}>
            {resetLoading ? '處理中…' : '重設密碼'}
          </button>
          {resetMsg && (
            <div style={{
              marginTop: 10, fontSize: 12, textAlign: 'center',
              color: resetMsg.startsWith('✓') ? 'var(--ok)' : 'var(--danger)',
              fontFamily: 'var(--font-mono)',
            }}>
              {resetMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
