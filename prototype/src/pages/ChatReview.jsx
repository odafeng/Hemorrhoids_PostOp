import { useState, useEffect } from 'react';
import { getResearcherMockData } from '../utils/storage';
import * as sb from '../utils/supabaseService';

export default function ChatReview({ onNavigate, isDemo, userInfo }) {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadChats();
  }, [isDemo]);

  const loadChats = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        const mock = getResearcherMockData();
        setChats(mock.chatLogs);
      } else {
        const data = await sb.getUnreviewedChats();
        setChats(data);
      }
    } catch (err) {
      console.error('Chat review load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (chatId, result) => {
    try {
      if (isDemo) {
        // Update local state
        setChats(prev => prev.map(c =>
          c.id === chatId
            ? { ...c, reviewed: true, review_result: result, review_notes: reviewNotes }
            : c
        ));
      } else {
        await sb.reviewChat(chatId, result, reviewNotes, userInfo?.studyId || 'researcher');
        setChats(prev => prev.map(c =>
          c.id === chatId
            ? { ...c, reviewed: true, review_result: result, review_notes: reviewNotes }
            : c
        ));
      }
      setReviewingId(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Review error:', err);
    }
  };

  const unreviewed = chats.filter(c => !c.reviewed);
  const reviewed = chats.filter(c => c.reviewed);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1s infinite' }}>載入中...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
        <button
          onClick={() => onNavigate('researcherDashboard')}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: 'var(--font-lg)', cursor: 'pointer', padding: 0,
          }}
        >
          ←
        </button>
        <h1 className="page-title" style={{ marginBottom: 0 }}>AI 回覆審核</h1>
      </div>
      <p className="page-subtitle">
        待審核 {unreviewed.length} 則 / 已審核 {reviewed.length} 則
      </p>

      {/* Unreviewed */}
      {unreviewed.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>✅</div>
          <p style={{ color: 'var(--text-secondary)' }}>所有 AI 回覆皆已審核完畢</p>
        </div>
      )}

      {unreviewed.map((chat, i) => (
        <div key={chat.id} className="card review-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="review-meta">
            <span className="review-study-id">{chat.study_id}</span>
            <span className="review-date">{chat.created_at}</span>
          </div>

          <div className="review-bubble user-q">
            <div className="review-label">病人提問</div>
            {chat.user_message}
          </div>

          <div className="review-bubble ai-a">
            <div className="review-label">AI 回覆</div>
            {chat.ai_response}
          </div>

          {reviewingId === chat.id ? (
            <div className="review-actions-expanded">
              <textarea
                className="survey-textarea"
                placeholder="審核備註（選填）..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                rows={2}
                style={{ marginBottom: 'var(--space-sm)' }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-review correct" onClick={() => handleReview(chat.id, 'correct')}>
                  ✓ 正確
                </button>
                <button className="btn btn-review incorrect" onClick={() => handleReview(chat.id, 'incorrect')}>
                  ✗ 需修正
                </button>
              </div>
              <button className="btn btn-secondary" onClick={() => { setReviewingId(null); setReviewNotes(''); }}
                style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--font-xs)', padding: 'var(--space-xs) var(--space-sm)' }}>
                取消
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setReviewingId(chat.id)}
              style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-sm)' }}>
              📝 審核此則
            </button>
          )}
        </div>
      ))}

      {/* Reviewed section */}
      {reviewed.length > 0 && (
        <>
          <div className="divider" />
          <h2 style={{ fontSize: 'var(--font-base)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            已審核紀錄
          </h2>
          {reviewed.map(chat => (
            <div key={chat.id} className="card review-card" style={{ opacity: 0.7 }}>
              <div className="review-meta">
                <span className="review-study-id">{chat.study_id}</span>
                <span className={`status-badge ${chat.review_result === 'correct' ? 'completed' : 'pending'}`}>
                  {chat.review_result === 'correct' ? '✓ 正確' : '✗ 需修正'}
                </span>
              </div>
              <div className="review-bubble user-q" style={{ fontSize: 'var(--font-xs)' }}>
                {chat.user_message}
              </div>
              <div className="review-bubble ai-a" style={{ fontSize: 'var(--font-xs)' }}>
                {chat.ai_response}
              </div>
              {chat.review_notes && (
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
                  備註：{chat.review_notes}
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
