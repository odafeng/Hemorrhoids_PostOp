import { useState } from 'react';
import { useHistoryData } from '../utils/hooks';
import { isWoundNormal, formatWound } from '../utils/schemaContract';
import { useNavigate } from 'react-router-dom';
import * as I from '../components/Icons';

const PAIN_TONE = (v) => v == null ? '' : v <= 3 ? 'ok' : v <= 6 ? 'warn' : 'danger';

export default function History({ isDemo, userInfo }) {
  const { data: allReports = [], isLoading } = useHistoryData(isDemo, userInfo);
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-CA');
  const [chartRange, setChartRange] = useState(14);

  const surgeryDate = userInfo?.surgeryDate;
  const calcPod = (reportDate) => {
    if (!surgeryDate || !reportDate) return null;
    const s = new Date(surgeryDate);
    const r = new Date(reportDate);
    s.setHours(0, 0, 0, 0);
    r.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((r - s) / (1000 * 60 * 60 * 24)));
  };

  const sortedAsc = [...allReports].sort((a, b) => a.date.localeCompare(b.date));
  const chartReports = chartRange > 0 ? sortedAsc.slice(-chartRange) : sortedAsc;

  const W = 360, H = 140, padX = 26, padY = 18;
  const cW = W - padX * 2, cH = H - padY * 2;
  const pts = chartReports.map((r, i) => {
    const x = padX + (chartReports.length === 1 ? cW / 2 : (i / (chartReports.length - 1)) * cW);
    const y = padY + cH - (r.pain / 10) * cH;
    return { x, y, pain: r.pain, date: r.date, pod: calcPod(r.date) };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--ink-2)', animation: 'pulse 1s infinite', fontFamily: 'var(--font-mono)' }}>載入中…</p>
      </div>
    );
  }

  if (allReports.length === 0) {
    return (
      <div className="page">
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label="返回">
            <I.ArrowLeft width={17} height={17} />
          </button>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>歷史紀錄</div>
          <div style={{ width: 36 }} />
        </div>
        <div className="page-head">
          <div className="eyebrow">RECOVERY HISTORY</div>
          <h1 className="page-title">恢復歷程</h1>
          <p className="page-sub">查看您的症狀回報歷程</p>
        </div>
        <div className="empty-state">
          <div style={{ color: 'var(--ink-3)', marginBottom: 'var(--space-md)' }}>
            <I.Chart width={48} height={48} />
          </div>
          <p>尚無回報紀錄</p>
          <p>完成第一次症狀回報後，紀錄將顯示於此。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="返回">
          <I.ArrowLeft width={17} height={17} />
        </button>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          歷史紀錄
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-head">
        <div className="eyebrow">RECOVERY HISTORY</div>
        <h1 className="page-title">恢復歷程</h1>
        <p className="page-sub">共 {allReports.length} 次回報{surgeryDate && ` · 手術日期 ${surgeryDate}`}</p>
      </div>

      {/* Chart */}
      {pts.length > 0 && (
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="card-kicker" style={{ marginBottom: 2 }}>PAIN NRS TREND</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>疼痛分數趨勢</div>
            </div>
            <div className="range-row">
              {[7, 14, 0].map((r) => (
                <button key={r} className={`range-chip ${chartRange === r ? 'on' : ''}`}
                  onClick={() => setChartRange(r)}>
                  {r === 0 ? 'ALL' : `${r}D`}
                </button>
              ))}
            </div>
          </div>
          <div className="chart">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 2, 4, 6, 8, 10].map((v) => {
                const y = padY + cH - (v / 10) * cH;
                return (
                  <g key={v}>
                    <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="var(--chart-grid)" strokeWidth="1" strokeDasharray={v === 0 || v === 10 ? '' : '2 3'} />
                    <text x={padX - 6} y={y + 3} fill="var(--ink-3)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">{v}</text>
                  </g>
                );
              })}
              {pts.length > 1 && (
                <>
                  <path d={`${path} L ${pts[pts.length - 1].x} ${padY + cH} L ${pts[0].x} ${padY + cH} Z`} fill="url(#painGrad)" />
                  <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5"
                  fill="var(--surface)"
                  stroke={p.pain >= 7 ? 'var(--danger)' : p.pain >= 4 ? 'var(--warn)' : 'var(--ok)'}
                  strokeWidth="2" />
              ))}
              {pts.length > 0 && pts.filter((_, i) => i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)).map((p, i) => (
                <text key={`pod-${i}`} x={p.x} y={H - 4} fill="var(--ink-3)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
                  {p.pod != null ? `POD ${p.pod}` : p.date.slice(5)}
                </text>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card-kicker" style={{ margin: '14px 4px 10px' }}>DAILY REPORTS</div>
      {allReports.map((report, idx) => {
        const hasAlert = report.pain >= 8 || report.bleeding === '持續' || report.bleeding === '血塊' || report.fever || report.urinary === '尿不出來' || report.continence === '失禁';
        const concerning = !hasAlert && report.pain >= 5;
        const pod = calcPod(report.date);
        return (
          <div key={report.date} className={`tl-item ${hasAlert ? 'alert' : concerning ? 'warn' : 'ok'}`} style={{ animationDelay: `${idx * 0.04}s` }}>
            <div className="tl-date">{pod != null ? `POD ${pod}` : '—'} · {report.date}</div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="sym-list">
                <div className="sym-row"><span className="sym-name">疼痛</span>
                  <span className={`sym-val ${PAIN_TONE(report.pain)}`}>{report.pain}<span className="unit">/10</span></span></div>
                <div className="sym-row"><span className="sym-name">出血</span>
                  <span className={`sym-val ${report.bleeding === '持續' || report.bleeding === '血塊' ? 'danger' : report.bleeding === '少量' ? 'warn' : 'ok'}`}>{report.bleeding}</span></div>
                <div className="sym-row"><span className="sym-name">排便</span>
                  <span className={`sym-val ${report.bowel === '未排' || report.bowel === '困難' ? 'warn' : 'ok'}`}>{report.bowel}</span></div>
                {report.fever && (
                  <div className="sym-row"><span className="sym-name">發燒</span>
                    <span className="sym-val danger">是</span></div>
                )}
                <div className="sym-row"><span className="sym-name">傷口</span>
                  <span className={`sym-val ${isWoundNormal(report.wound) ? 'ok' : 'warn'}`}>{formatWound(report.wound)}</span></div>
                {report.urinary && report.urinary !== '正常' && (
                  <div className="sym-row"><span className="sym-name">排尿</span>
                    <span className={`sym-val ${report.urinary === '尿不出來' ? 'danger' : 'warn'}`}>{report.urinary}</span></div>
                )}
                {report.continence && report.continence !== '正常' && (
                  <div className="sym-row"><span className="sym-name">肛門控制</span>
                    <span className={`sym-val ${report.continence === '失禁' ? 'danger' : 'warn'}`}>{report.continence}</span></div>
                )}
              </div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => navigate(report.date === today ? '/report' : `/report?date=${report.date}`)}
              >
                <I.Edit width={14} height={14} /> {report.date === today ? '修改此回報' : '修改此筆紀錄'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
