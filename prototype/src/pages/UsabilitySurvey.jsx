import { useState, useEffect } from 'react';
import * as sb from '../utils/supabaseService';
import { getSurveyLocal, saveSurveyLocal } from '../utils/storage';

const questions = [
  {
    key: 'ease_of_use',
    label: '我覺得這個系統容易使用',
    icon: '📱',
  },
  {
    key: 'usefulness',
    label: '這個系統對我的術後恢復有幫助',
    icon: '💡',
  },
  {
    key: 'satisfaction',
    label: '整體而言，我對這個系統感到滿意',
    icon: '😊',
  },
  {
    key: 'recommend',
    label: '我會推薦其他病人使用這個系統',
    icon: '👍',
  },
  {
    key: 'overall_score',
    label: '整體評分',
    icon: '⭐',
  },
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

  // Loading
  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>載入中...</p>
      </div>
    );
  }

  // Already done
  if (alreadyDone) {
    return (
      <div className="page">
        <h1 className="page-title">系統可用性問卷</h1>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>✅</div>
          <div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
            感謝您已完成問卷
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            您的回饋將幫助我們改進系統。
          </p>
          <button className="btn btn-secondary" onClick={onComplete} style={{ marginTop: 'var(--space-lg)' }}>
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // Success overlay
  if (showSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-checkmark">🎉</div>
        <div className="success-text">感謝您的回饋</div>
        <div className="success-sub">您的意見對我們非常重要</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">系統可用性問卷</h1>
      <p className="page-subtitle">
        請針對以下各項進行評分，幫助我們改善系統（約 1 分鐘）
      </p>

      {/* Likert Questions */}
      {questions.map((q, qi) => (
        <div key={q.key} className="survey-question" style={{ animationDelay: `${qi * 0.05}s` }}>
          <div className="survey-question-label">
            <span className="survey-question-icon">{q.icon}</span>
            <span>{q.label}</span>
          </div>
          <div className="likert-group">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                className={`likert-btn ${answers[q.key] === v ? 'selected' : ''}`}
                onClick={() => handleSelect(q.key, v)}
              >
                <span className="likert-number">{v}</span>
              </button>
            ))}
          </div>
          <div className="likert-labels">
            <span>{scaleLabels[0]}</span>
            <span>{scaleLabels[4]}</span>
          </div>
        </div>
      ))}

      {/* Feedback textarea */}
      <div className="survey-question" style={{ animationDelay: `${questions.length * 0.05}s` }}>
        <div className="survey-question-label">
          <span className="survey-question-icon">💬</span>
          <span>您的建議或意見（選填）</span>
        </div>
        <textarea
          className="survey-textarea"
          placeholder="請分享您使用系統的心得或改進建議..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="alert-banner danger" style={{ marginBottom: 'var(--space-md)' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-content"><div className="alert-message">{error}</div></div>
        </div>
      )}

      {/* Submit */}
      <button
        className="btn btn-primary"
        disabled={!allAnswered || submitting}
        onClick={handleSubmit}
        style={{ marginTop: 'var(--space-md)' }}
      >
        {submitting ? '提交中...' : '提交問卷'}
      </button>

      {!allAnswered && (
        <p style={{
          textAlign: 'center',
          fontSize: 'var(--font-xs)',
          color: 'var(--text-muted)',
          marginTop: 'var(--space-sm)',
        }}>
          請完成所有評分項目後提交
        </p>
      )}
    </div>
  );
}
