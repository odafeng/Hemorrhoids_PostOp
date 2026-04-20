import { useState, useRef, useEffect, useCallback } from 'react';

const CONSENT_TEXT = `
研究計畫名稱：痔瘡手術術後 AI 衛教系統之可行性研究

主持人：黃士峯 醫師
執行機構：高雄榮民總醫院 大腸直腸外科

一、研究目的
本研究旨在評估一套結合人工智慧（AI）的術後衛教系統，是否能有效提升痔瘡手術後病人的自我照護能力、改善症狀追蹤的依從率，並提供即時的衛教資訊回饋。

二、研究方法
您將使用本系統進行為期 30 天的術後追蹤，包括：
1. 每日填寫症狀回報（疼痛、出血、排便等，約 30 秒）
2. 使用 AI 衛教助手詢問術後恢復相關問題
3. 於第 14 天後填寫系統可用性問卷

三、資料收集與隱私保護
• 您的個人識別資訊（姓名、身分證、病歷號）將以 AES-256 加密儲存，僅主持人可存取
• 研究資料（症狀回報、AI 對話紀錄）以去識別化方式儲存，研究團隊僅能存取研究編號
• 所有資料傳輸均使用 HTTPS 加密
• 資料將保存至研究結束後 3 年，届時將予以銷毀
• AI 衛教回覆僅供參考，不構成醫療診斷或治療建議

四、可能的風險與不適
本系統僅提供一般性衛教資訊，不涉及額外的醫療介入。可能的風險包括：
• 使用手機 App 的時間花費（每日約 1-2 分鐘）
• 系統通知可能造成的輕微干擾
若有任何不適，您可隨時退出研究。

五、參與者權益
• 參與本研究完全自願，您可以隨時退出，不影響您的醫療權益
• 退出研究後，您的資料將依規定處理（去識別化資料保留供分析，個資將刪除）
• 研究成果將以匿名方式發表，不會揭露您的個人資訊
• 若有任何問題，請聯絡研究團隊

六、聯絡資訊
主持人：黃士峯 醫師
聯絡電話：(07) 731-7123
電子郵件：drfredrichuang@gmail.com
IRB 審查委員會：高雄榮民總醫院人體試驗委員會
`.trim();

export default function ConsentPage({ userInfo, onConsent, onDecline }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checks, setChecks] = useState({ purpose: false, risks: false, withdraw: false, data: false });
  const [signatureData, setSignatureData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const allChecked = Object.values(checks).every(Boolean);
  const canSign = scrolledToBottom && allChecked && !!signatureData;

  const toggle = (k) => setChecks((c) => ({ ...c, [k]: !c[k] }));

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (nearBottom) setScrolledToBottom(true);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e) => {
      const t = e.touches?.[0];
      const cx = t ? t.clientX : e.clientX;
      const cy = t ? t.clientY : e.clientY;
      return { x: cx - rect.left, y: cy - rect.top };
    };
    const start = (e) => { e.preventDefault(); isDrawingRef.current = true; lastPosRef.current = getPos(e); };
    const move = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPosRef.current = p;
    };
    const end = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setSignatureData(canvas.toDataURL('image/png'));
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, []);

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignatureData(null);
  };

  const handleSubmit = async () => {
    if (!canSign) return;
    setSubmitting(true);
    try {
      await onConsent(signatureData);
    } catch (err) {
      console.error('Consent submit error:', err);
      alert('提交失敗，請重試：' + (err.message || ''));
      setSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString('zh-TW');
  const studyId = userInfo?.studyId || '—';

  return (
    <div className="consent-view">
      <div className="c-head">
        <div className="c-eyebrow">IRB-2026-CRS-041 · VERSION 2.1</div>
        <h1 className="c-title">研究知情同意書</h1>
        <p className="c-sub">痔瘡手術術後症狀追蹤 · 使用 AI 衛教之可行性研究</p>
      </div>

      <div className="c-body">
        <section className="c-section">
          <div className="c-sec-label">01 · 研究目的</div>
          <p>本研究將收集您術後 30 天內的症狀回報，建立疼痛與恢復曲線模型，並評估 AI 衛教對自我照護行為的影響。</p>
        </section>
        <section className="c-section">
          <div className="c-sec-label">02 · 可能風險</div>
          <p>每日症狀填寫約需 2 分鐘。AI 回覆為衛教參考，不取代醫師診斷；若出現警示徵象，系統會主動提示您回診。</p>
        </section>
        <section className="c-section">
          <div className="c-sec-label">03 · 資料處理</div>
          <p>所有資料將去識別化並加密儲存，受 RLS（Row-Level Security）隔離。研究結束後保存 3 年，之後銷毀。</p>
        </section>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="c-fulltext"
        aria-label="完整同意書內容"
      >
        {CONSENT_TEXT}
      </div>

      {!scrolledToBottom && (
        <div className="c-scroll-hint">↓ 請滑至上方區塊最底部以解鎖勾選</div>
      )}

      <div className="c-checks" data-locked={!scrolledToBottom}>
        <label className="c-chk">
          <input type="checkbox" checked={checks.purpose} onChange={() => toggle('purpose')} disabled={!scrolledToBottom} />
          <span>我已閱讀並了解研究目的</span>
        </label>
        <label className="c-chk">
          <input type="checkbox" checked={checks.risks} onChange={() => toggle('risks')} disabled={!scrolledToBottom} />
          <span>我已了解可能的風險與益處</span>
        </label>
        <label className="c-chk">
          <input type="checkbox" checked={checks.withdraw} onChange={() => toggle('withdraw')} disabled={!scrolledToBottom} />
          <span>我了解可隨時退出研究，不影響醫療權益</span>
        </label>
        <label className="c-chk">
          <input type="checkbox" checked={checks.data} onChange={() => toggle('data')} disabled={!scrolledToBottom} />
          <span>我同意資料被去識別化使用於學術研究</span>
        </label>
      </div>

      <div className="c-sig">
        <div className="c-sig-label">
          <span>簽名 · Signature</span>
          {signatureData && (
            <button type="button" className="c-sig-clear" onClick={clearSignature}>清除重簽</button>
          )}
        </div>
        <div className="c-sig-canvas-wrap">
          <canvas ref={canvasRef} className="c-sig-canvas" />
          {!signatureData && <div className="c-sig-placeholder">在此手寫簽名</div>}
        </div>
        <div className="c-sig-meta">
          <span>{today}</span>
          <span>{studyId}</span>
        </div>
      </div>

      <div className="c-actions">
        <button type="button" className="c-btn c-btn-ghost" onClick={onDecline} disabled={submitting}>
          拒絕
        </button>
        <button type="button" className="c-btn c-btn-primary" disabled={!canSign || submitting} onClick={handleSubmit}>
          {submitting ? '提交中…' : '簽署並開始 ›'}
        </button>
      </div>
    </div>
  );
}
