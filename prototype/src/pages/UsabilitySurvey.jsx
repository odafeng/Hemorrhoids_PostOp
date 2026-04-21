import { useState, useEffect } from 'react';
import * as sb from '../utils/supabaseService';
import { getSurveyLocal, saveSurveyLocal } from '../utils/storage';
import * as I from '../components/Icons';

const questions = [
  { key: 'ease_of_use', label: '我覺得這個系統容易使用' },
  { key: 'usefulness', label: '這個系統對我的術後恢復有幫助' },
  { key: 'satisfaction', label: '整體而言，我對這個系統感到滿意' },
  { key: 'recommend', label: '我會推薦其他病人使用這個系統' },
  { key: 'overall_score', label: '整體評分' },
];

const scaleLabels = ['非常不同意', '不同意', '普通', '同意', '非常同意'];

export default function UsabilitySurvey({ onComplete, isDemo, userInfo }) {
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if already submitted
  useEffect(() => {
    const check = async () => {
      try {
        if (isDemo) {
          const existing = getSurveyLocal();
          if (existing) setAlreadyDone(true);
        } else if (userInfo?.studyId) {
          const existing = await sb.getSurvey(userInfo.studyId);
          if (existing) setAlreadyDone(true);
        }
      } catch (err) {
        console.error('Survey check error:', err);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [isDemo, userInfo]);

  const allAnswered = questions.every(q => answers[q.key] >= 1);

  const handleSelect = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError('');

    const survey = {
      ease_of_use: answers.ease_of_use,
      usefulness: answers.usefulness,
      satisfaction: answers.satisfaction,
      recommend: answers.recommend,
      overall_score: answers.overall_score,
      feedback_text: feedback.trim() || null,
    };

    try {
      if (isDemo) {
        saveSurveyLocal(survey);
      } else {
        const pod = userInfo?.pod || 0;
        await sb.saveSurvey(userInfo.studyId, pod, survey);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete();
      }, 2500);
    } catch (err) {
      console.error('Survey submit error:', err);
      setError('提交失敗：' + (err.message || '請稍後再試'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--ink-2)', animation: 'pulse 1s infinite', fontFamily: 'var(--font-mono)' }}>載入中…</p>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="page">
        <div className="topbar">
          <button className="icon-btn" onClick={onComplete} aria-label="返回">
            <I.ArrowLeft width={17} height={17} />
          </button>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>USABILITY SURVEY</div>
          <div style={{ width: 36 }} />
        </div>
        <div className="page-head">
          <div className="eyebrow">USABILITY SURVEY</div>
          <h1 className="page-title">系統可用性問卷</h1>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--ok-soft)', color: 'var(--ok)',
            display: 'grid', placeItems: 'center', margin: '0 auto 12px',
          }}>
            <I.Check width={32} height={32} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
            感謝您已完成問卷
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
            您的回饋將幫助我們改進系統。
          </p>
          <button className="btn btn-secondary" onClick={onComplete} style={{ marginTop: 16 }}>
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-checkmark"><I.Check width={40} height={40} /></div>
        <div className="success-text">感謝您的回饋</div>
        <div className="success-sub">您的意見對我們非常重要</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={onComplete} aria-label="返回">
          <I.ArrowLeft width={17} height={17} />
        </button>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>USABILITY SURVEY</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-head">
        <div className="eyebrow">POST-OP DAY 14+</div>
        <h1 className="page-title">系統可用性問卷</h1>
        <p className="page-sub">請針對以下各項評分，約 1 分鐘</p>
      </div>

      {questions.map((q) => (
        <div key={q.key} className="field">
          <div className="field-lbl" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600 }}>
            {q.label}
          </div>
          <div className="likert-group">
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v}
                className={`likert-btn ${answers[q.key] === v ? 'selected' : ''}`}
                onClick={() => handleSelect(q.key, v)}>
                {v}
              </button>
            ))}
          </div>
          <div className="likert-labels">
            <span>{scaleLabels[0]}</span>
            <span>{scaleLabels[4]}</span>
          </div>
        </div>
      ))}

      <div className="field">
        <div className="field-lbl">您的建議或意見 <span className="hint">選填</span></div>
        <textarea className="survey-textarea"
          placeholder="請分享您使用系統的心得或改進建議…"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3} />
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: 12 }}>
          <div className="al-icon"><I.Alert width={18} height={18} /></div>
          <div><div className="al-msg">{error}</div></div>
        </div>
      )}

      <button className="btn btn-primary" disabled={!allAnswered || submitting} onClick={handleSubmit}>
        {submitting ? '提交中…' : <>提交問卷 <I.Check width={16} height={16} /></>}
      </button>

      {!allAnswered && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', marginTop: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
          請完成所有評分項目後提交
        </p>
      )}
    </div>
  );
}
