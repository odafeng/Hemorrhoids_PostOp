import { useState } from 'react';
import { saveReport as saveLocalReport, getTodayReport, getPOD } from '../utils/storage';
import * as sb from '../utils/supabaseService';
import { checkAlerts } from '../utils/alerts';

const bleedingOptions = ['無', '少量', '持續', '血塊'];
const bowelOptions = ['正常', '困難', '未排'];
const woundOptions = ['無異常', '腫脹', '分泌物', '搔癢', '異物感', '其他'];

export default function SymptomReport({ onComplete, isDemo, userInfo }) {
  const existing = isDemo ? getTodayReport() : null;

  const [pain, setPain] = useState(existing?.pain ?? 3);
  const [bleeding, setBleeding] = useState(existing?.bleeding ?? '');
  const [bowel, setBowel] = useState(existing?.bowel ?? '');
  const [fever, setFever] = useState(existing?.fever ?? false);
  const [wound, setWound] = useState(() => {
    if (!existing?.wound) return [];
    return typeof existing.wound === 'string' ? existing.wound.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  const [woundOther, setWoundOther] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleWound = (opt) => {
    setWound(prev => {
      if (opt === '無異常') {
        return prev.includes('無異常') ? [] : ['無異常'];
      }
      const without = prev.filter(w => w !== '無異常');
      return without.includes(opt) ? without.filter(w => w !== opt) : [...without, opt];
    });
  };

  const isValid = bleeding && bowel && wound.length > 0 && (!wound.includes('其他') || woundOther.trim());

  const getPainColor = (v) => {
    if (v <= 3) return 'var(--success)';
    if (v <= 6) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getPainText = (v) => {
    if (v === 0) return '無痛';
    if (v <= 3) return '輕度疼痛';
    if (v <= 6) return '中度疼痛';
    if (v <= 8) return '嚴重疼痛';
    return '劇烈疼痛';
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError('');

    const woundValue = wound.map(w => w === '其他' ? `其他:${woundOther.trim()}` : w).join(',');
    const report = { pain, bleeding, bowel, fever, wound: woundValue };

    try {
      if (isDemo) {
        saveLocalReport(report);
      } else {
        const pod = userInfo?.pod || 0;
        await sb.saveReport(userInfo.studyId, pod, report);

        const allReports = await sb.getAllReports(userInfo.studyId);
        const mapped = allReports.map(r => ({
          date: r.report_date,
          pain: r.pain_nrs,
          bleeding: r.bleeding,
          bowel: r.bowel,
          fever: r.fever,
          wound: r.wound,
        }));
        const newAlerts = checkAlerts(mapped);
        for (const alert of newAlerts) {
          await sb.createAlert(userInfo.studyId, alert);
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete();
      }, 1800);
    } catch (err) {
      console.error('Submit error:', err);
      setError('提交失敗：' + (err.message || '請稍後再試'));
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-checkmark">✓</div>
        <div className="success-text">回報成功</div>
        <div className="success-sub">感謝您的填寫，祝您早日康復</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">症狀回報</h1>
      <p className="page-subtitle">請填寫今日的身體狀況（約 30 秒）</p>

      {/* Pain NRS */}
      <div className="form-group">
        <label className="form-label">疼痛分數 <span>（NRS 0–10）</span></label>
        <div className="pain-slider-container">
          <div className="pain-value-display">
            <div className="pain-number" style={{ color: getPainColor(pain) }}>{pain}</div>
            <div className="pain-label">{getPainText(pain)}</div>
          </div>
          <input type="range" className="pain-slider" min="0" max="10" value={pain} onChange={e => setPain(Number(e.target.value))} />
          <div className="pain-scale">
            <span>0 無痛</span><span>5 中度</span><span>10 劇痛</span>
          </div>
        </div>
      </div>

      {/* Bleeding */}
      <div className="form-group">
        <label className="form-label">出血程度</label>
        <div className="option-group">
          {bleedingOptions.map(opt => (
            <button key={opt}
              className={`option-pill ${bleeding === opt ? (opt === '持續' || opt === '血塊' ? 'danger-selected' : 'selected') : ''}`}
              onClick={() => setBleeding(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Bowel */}
      <div className="form-group">
        <label className="form-label">排便狀況</label>
        <div className="option-group">
          {bowelOptions.map(opt => (
            <button key={opt} className={`option-pill ${bowel === opt ? 'selected' : ''}`} onClick={() => setBowel(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Fever */}
      <div className="form-group">
        <label className="form-label">發燒 <span>（體溫 ≥ 38°C）</span></label>
        <div className="toggle-group">
          <button className={`toggle-btn ${fever === false ? 'selected' : ''}`} onClick={() => setFever(false)}>否</button>
          <button className={`toggle-btn ${fever === true ? 'danger-selected' : ''}`} onClick={() => setFever(true)}>是</button>
        </div>
      </div>

      {/* Wound — Multi-select */}
      <div className="form-group">
        <label className="form-label">傷口狀況 <span>（可複選）</span></label>
        <div className="option-group" style={{ flexWrap: 'wrap' }}>
          {woundOptions.map(opt => (
            <button key={opt}
              className={`option-pill ${wound.includes(opt) ? 'selected' : ''}`}
              onClick={() => toggleWound(opt)}>{opt}</button>
          ))}
        </div>
        {wound.includes('其他') && (
          <input
            className="chat-input"
            style={{ width: '100%', marginTop: 'var(--space-sm)' }}
            placeholder="請描述傷口狀況..."
            value={woundOther}
            onChange={e => setWoundOther(e.target.value)}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert-banner danger" style={{ marginBottom: 'var(--space-md)' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-content"><div className="alert-message">{error}</div></div>
        </div>
      )}

      {/* Submit */}
      <button className="btn btn-primary" disabled={!isValid || submitting} onClick={handleSubmit} style={{ marginTop: 'var(--space-md)' }}>
        {submitting ? '提交中...' : '提交回報'}
      </button>
    </div>
  );
}
