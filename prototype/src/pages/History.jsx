import { useHistoryData } from '../utils/hooks';

export default function History({ isDemo, userInfo }) {
  const { data: allReports = [], isLoading, error } = useHistoryData(isDemo, userInfo);

  // Recalculate POD from surgery date — don't trust stored pod value
  const surgeryDate = userInfo?.surgeryDate;
  const calcPod = (reportDate) => {
    if (!surgeryDate || !reportDate) return null;
    const s = new Date(surgeryDate);
    const r = new Date(reportDate);
    s.setHours(0, 0, 0, 0);
    r.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((r - s) / (1000 * 60 * 60 * 24)));
  };

  const formatPod = (reportDate) => {
    const pod = calcPod(reportDate);
    if (pod === null) return '—';
    if (pod === 0) return 'OP';
    return `POD ${pod}`;
  };

  const getPainColor = (pain) => {
    if (pain <= 3) return 'var(--success)';
    if (pain <= 6) return 'var(--warning)';
    return 'var(--danger)';
  };

  // Simple SVG pain chart
  const chartReports = [...allReports].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const renderChart = () => {
    if (chartReports.length < 2) return null;
    const w = 360, h = 140, padX = 30, padY = 20;
    const chartW = w - padX * 2, chartH = h - padY * 2;
    const points = chartReports.map((r, i) => {
      const x = padX + (i / (chartReports.length - 1)) * chartW;
      const y = padY + chartH - (r.pain / 10) * chartH;
      return { x, y, pain: r.pain, date: r.date };
    });
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

    return (
      <div className="pain-chart">
        <div className="chart-title">📈 疼痛趨勢</div>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 2, 4, 6, 8, 10].map(v => {
            const y = padY + chartH - (v / 10) * chartH;
            return (<g key={v}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={padX - 6} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{v}</text>
            </g>);
          })}
          <path d={areaD} fill="url(#painGrad)" />
          <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (<g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={getPainColor(p.pain)} stroke="var(--bg-primary)" strokeWidth="2" />
            <text x={p.x} y={h - 4} fill="var(--text-muted)" fontSize="8" textAnchor="middle">{p.date.slice(5)}</text>
          </g>))}
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>載入中...</p>
      </div>
    );
  }

  if (allReports.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">歷史紀錄</h1>
        <p className="page-subtitle">查看您的症狀回報歷程</p>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>尚無回報紀錄</p>
          <p>完成第一次症狀回報後，紀錄將顯示於此。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">歷史紀錄</h1>
      <p className="page-subtitle">已完成 {allReports.length} 次回報</p>
      {renderChart()}
      <div className="timeline">
        {allReports.map((report, idx) => {
          const hasAlert = report.pain >= 8 || report.bleeding === '持續' || report.bleeding === '血塊' || report.fever || report.urinary === '尿不出來' || report.continence === '失禁';
          return (
            <div key={report.date} className={`timeline-item ${hasAlert ? 'alert' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="timeline-date">{formatPod(report.date)} ・ {report.date}</div>
              <div className={`timeline-card ${hasAlert ? 'has-alert' : ''}`}>
                <div className="symptom-row"><span className="symptom-name">疼痛</span>
                  <span className="symptom-value" style={{ color: getPainColor(report.pain) }}>{report.pain}/10</span></div>
                <div className="symptom-row"><span className="symptom-name">出血</span>
                  <span className={`symptom-value ${report.bleeding === '持續' || report.bleeding === '血塊' ? 'danger' : report.bleeding === '少量' ? 'warning' : 'success'}`}>{report.bleeding}</span></div>
                <div className="symptom-row"><span className="symptom-name">排便</span>
                  <span className={`symptom-value ${report.bowel === '未排' ? 'warning' : report.bowel === '困難' ? 'warning' : 'success'}`}>{report.bowel}</span></div>
                <div className="symptom-row"><span className="symptom-name">發燒</span>
                  <span className={`symptom-value ${report.fever ? 'danger' : 'success'}`}>{report.fever ? '是' : '否'}</span></div>
                <div className="symptom-row"><span className="symptom-name">傷口</span>
                  <span className={`symptom-value ${report.wound === '無異常' ? 'success' : 'warning'}`}>{report.wound}</span></div>
                <div className="symptom-row"><span className="symptom-name">排尿</span>
                  <span className={`symptom-value ${report.urinary === '尿不出來' ? 'danger' : report.urinary === '困難' ? 'warning' : 'success'}`}>{report.urinary || '—'}</span></div>
                <div className="symptom-row"><span className="symptom-name">肛門控制</span>
                  <span className={`symptom-value ${report.continence === '失禁' ? 'danger' : report.continence === '滲便' ? 'warning' : 'success'}`}>{report.continence || '—'}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
