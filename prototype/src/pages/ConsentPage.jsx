import { useState, useRef, useEffect, useCallback } from 'react';

// IRB-approved consent text — update this with your actual IRB document
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
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Detect scroll to bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (nearBottom) setScrolledToBottom(true);
  }, []);

  // Canvas drawing
  useEffect(() => {
    if (!signing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set canvas resolution
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e) => {
      const touch = e.touches?.[0];
      const clientX = touch ? touch.clientX : e.clientX;
      const clientY = touch ? touch.clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      lastPosRef.current = getPos(e);
    };

    const move = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
    };

    const end = () => {
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
  }, [signing]);

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignatureData(null);
  };

  const handleSubmit = async () => {
    if (!agreed || !signatureData) return;
    setSubmitting(true);
    try {
      await onConsent(signatureData);
    } catch (err) {
      console.error('Consent submit error:', err);
      alert('提交失敗，請重試：' + (err.message || ''));
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ minHeight: '100dvh', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>📋</div>
        <h1 className="page-title" style={{ fontSize: 'var(--font-xl)' }}>研究知情同意書</h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          請詳閱以下內容，滑至最底部後方可簽署
        </p>
      </div>

      {/* Consent text — scrollable */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          fontSize: 'var(--font-sm)',
          lineHeight: 1.8,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          maxHeight: '50vh',
          marginBottom: 'var(--space-md)',
        }}
      >
        {CONSENT_TEXT}
      </div>

      {!scrolledToBottom && (
        <p style={{ textAlign: 'center', color: 'var(--warning)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-sm)' }}>
          ↓ 請滑至最底部以繼續
        </p>
      )}

      {scrolledToBottom && !signing && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
            marginBottom: 'var(--space-md)', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '4px', width: '20px', height: '20px', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
              本人已詳閱並了解上述研究說明，同意自願參加本研究。
            </span>
          </label>

          <button
            className="btn btn-primary"
            disabled={!agreed}
            onClick={() => setSigning(true)}
            style={{ width: '100%', marginBottom: 'var(--space-sm)' }}
          >
            下一步：簽署同意書
          </button>
        </div>
      )}

      {signing && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textAlign: 'center' }}>
            請在下方空白處手寫簽名
          </p>

          {/* Signature canvas */}
          <div style={{
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: '#fff',
            marginBottom: 'var(--space-sm)',
            position: 'relative',
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '150px',
                touchAction: 'none',
                cursor: 'crosshair',
              }}
            />
            {!signatureData && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                color: '#ccc', fontSize: 'var(--font-sm)', pointerEvents: 'none',
              }}>
                在此簽名
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-secondary" onClick={clearSignature} style={{ flex: 1 }}>
              清除重簽
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!signatureData || submitting}
              style={{ flex: 2 }}
            >
              {submitting ? '提交中...' : '確認簽署'}
            </button>
          </div>
        </div>
      )}

      {/* Decline option */}
      <button
        onClick={onDecline}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: 'var(--font-xs)', cursor: 'pointer', marginTop: 'var(--space-sm)',
          textDecoration: 'underline', width: '100%', textAlign: 'center',
        }}
      >
        暫不簽署，返回登入
      </button>
    </div>
  );
}
