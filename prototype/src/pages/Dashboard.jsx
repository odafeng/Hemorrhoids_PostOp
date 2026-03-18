import { useState, useEffect } from 'react';
import { getPOD, getTodayReport, getAllReports, getSurgeryDate } from '../utils/storage';
import * as sb from '../utils/supabaseService';
import { checkAlerts } from '../utils/alerts';

export default function Dashboard({ onNavigate, isDemo, userInfo, onLogout }) {
  const [loading, setLoading] = useState(!isDemo);
  const [pod, setPod] = useState(0);
  const [todayReport, setTodayReport] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [surgeryDate, setSurgeryDate] = useState('');
  const [adherence, setAdherence] = useState(0);

  useEffect(() => {
    if (isDemo) {
      // Demo mode — use LocalStorage
      const p = getPOD();
      const today = getTodayReport();
      const all = getAllReports();
      const sd = getSurgeryDate();
      setPod(p);
      setTodayReport(today);
      setAllReports(all);
      setSurgeryDate(sd);
      // Remap for alert check
      const mapped = all.map(r => ({ ...r, pain: r.pain ?? r.pain_nrs }));
      setAlerts(checkAlerts(mapped));
      const totalDays = Math.max(1, p + 1);
      setAdherence(Math.round((all.length / totalDays) * 100));
    } else {
      loadSupabaseData();
    }
  }, [isDemo, userInfo]);

  const loadSupabaseData = async () => {
    if (!userInfo?.studyId) return;
    setLoading(true);
    try {
      const patient = await sb.getPatient(userInfo.studyId);
      const sd = patient?.surgery_date || new Date().toISOString().split('T')[0];
      const p = sb.getPODFromDate(sd);
      setSurgeryDate(sd);
      setPod(p);

      const all = await sb.getAllReports(userInfo.studyId);
      setAllReports(all);

      const today = await sb.getTodayReport(userInfo.studyId);
      setTodayReport(today);

      // Map Supabase field names for alert check
      const mapped = all.map(r => ({
        date: r.report_date,
        pain: r.pain_nrs,
        bleeding: r.bleeding,
        bowel: r.bowel,
        fever: r.fever,
        wound: r.wound,
      }));
      setAlerts(checkAlerts(mapped));

      const totalDays = Math.max(1, p + 1);
      setAdherence(Math.round((all.length / totalDays) * 100));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPainColor = (pain) => {
    if (pain <= 3) return 'var(--success)';
    if (pain <= 6) return 'var(--warning)';
    return 'var(--danger)';
  };

  const latestPain = allReports.length > 0
    ? (allReports[0]?.pain_nrs ?? allReports[0]?.pain ?? null)
    : null;

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>載入中...</p>
      </div>
    );
  }

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
    </div>
  );
}
