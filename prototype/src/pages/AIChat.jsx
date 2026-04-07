import { useState, useRef, useEffect } from 'react';
import { getAIResponse, quickQuestions } from '../utils/mockAI';
import { getClaudeResponse } from '../utils/claudeService';
import { getChatHistory, saveChatMessage } from '../utils/storage';
import * as sb from '../utils/supabaseService';

export default function AIChat({ isDemo, userInfo }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const welcomeMsg = {
    role: 'ai',
    text: '您好！我是高雄榮總術後衛教 AI 助手。\n\n我可以回答關於痔瘡手術後恢復的一般性問題，例如疼痛管理、傷口照護、飲食建議等。\n\n請選擇下方的常見問題，或直接輸入您的問題。',
  };

  useEffect(() => {
    const load = async () => {
      if (isDemo) {
        const saved = getChatHistory();
        setMessages(saved.length > 0 ? saved : [welcomeMsg]);
      } else if (userInfo?.studyId) {
        try {
          const logs = await sb.getChatLogs(userInfo.studyId);
          if (logs.length > 0) {
            const mapped = logs.flatMap(l => [
              { role: 'user', text: l.user_message },
              { role: 'ai', text: l.ai_response },
            ]);
            setMessages([welcomeMsg, ...mapped]);
          } else {
            setMessages([welcomeMsg]);
          }
        } catch (err) {
          console.error('Chat load error:', err);
          setMessages([welcomeMsg]);
        }
      } else {
        setMessages([welcomeMsg]);
      }
      setLoaded(true);
    };
    load();
  }, [isDemo, userInfo]);

  useEffect(() => {
    if (loaded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loaded]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    let response;
    let source = 'mock';
    if (isDemo) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      response = getAIResponse(text);
      source = 'mock';

      const aiMsg = { role: 'ai', text: response, source };
      setMessages(prev => [...prev, aiMsg]);
    } else {
      // Streaming: add placeholder AI message, then update it as chunks arrive
      const aiMsgIndex = messages.length + 1; // +1 for the user msg we just added
      setMessages(prev => [...prev, { role: 'ai', text: '...', source: 'claude' }]);
      setIsTyping(false); // Hide typing indicator — streaming text is visible

      const history = messages.filter(m => m.role === 'user' || m.role === 'ai');
      const result = await getClaudeResponse(text.trim(), { conversationHistory: history }, (textSoFar) => {
        // Update the last AI message progressively
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', text: textSoFar, source: 'claude' };
          return updated;
        });
      });

      // Final update with complete text
      response = result.text;
      source = result.source;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', text: response, source };
        return updated;
      });
    }

    setIsTyping(false);

    // Save
    if (isDemo) {
      saveChatMessage({ role: 'user', text: text.trim() });
      saveChatMessage({ role: 'ai', text: response, source });
    } else if (userInfo?.studyId) {
      try {
        await sb.saveChatLog(userInfo.studyId, text.trim(), response);
      } catch (err) {
        console.error('Save chat error:', err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-disclaimer">
        ⚠️ 本系統僅提供衛教資訊，不提供診斷或治療建議。如有緊急狀況請聯絡醫療機構。
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'ai' && (
              <div className="bubble-label">
                {msg.source === 'error'
                  ? '⚠️ 系統通知'
                  : msg.source === 'mock'
                  ? '📋 自動回覆（離線模式）'
                  : '🤖 AI 衛教助手'}
              </div>
            )}
            {msg.text}
            {msg.role === 'ai' && msg.source !== 'error' && i > 0 && (
              <div style={{
                fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '8px',
                borderTop: '1px solid var(--border)', paddingTop: '6px',
              }}>
                ⚠️ 僅供衛教參考，不構成醫療建議。如有疑慮請聯絡醫療團隊。
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="chat-bubble ai" style={{ opacity: 0.7 }}>
            <div className="bubble-label">🤖 AI 衛教助手</div>
            <span style={{ animation: 'pulse 1s infinite' }}>正在回覆中...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="quick-questions">
          {quickQuestions.map((q, i) => (
            <button key={i} className="quick-q" onClick={() => sendMessage(q)} disabled={isTyping}>{q}</button>
          ))}
        </div>
        <div className="chat-input-row">
          <input className="chat-input" placeholder="輸入您的問題..." value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isTyping} />
          <button className="chat-send" onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}>➤</button>
        </div>
      </div>
    </div>
  );
}
