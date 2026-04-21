import { useState, useEffect } from 'react';
import {
  isNotificationSupported,
  getNotificationStatus,
  requestPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  getReminderTime,
  setReminderTime,
  showReminderNotification,
} from '../utils/notifications';
import * as sb from '../utils/supabaseService';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Convert URL-safe base64 to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export default function NotificationSetup({ studyId, isDemo }) {
  const [permission, setPermission] = useState(getNotificationStatus());
  const [enabled, setEnabled] = useState(isNotificationsEnabled());
  const [time, setTime] = useState(getReminderTime());
  const [justEnabled, setJustEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState(''); // '', 'subscribing', 'subscribed', 'error'
  const [testStatus, setTestStatus] = useState(''); // '' | 'countdown' | 'fired' | 'failed' | 'denied'
  const [countdown, setCountdown] = useState(0);

  // On mount: load server prefs + check existing push subscription
  useEffect(() => {
    setPermission(getNotificationStatus());
    if (!isDemo && studyId) {
      sb.getNotifPrefs(studyId).then(prefs => {
        if (prefs) {
          setEnabled(prefs.enabled);
          setTime({ hour: prefs.hour, minute: prefs.minute });
          setNotificationsEnabled(prefs.enabled);
          setReminderTime(prefs.hour, prefs.minute);
        }
      });
      // Check if already subscribed to push
      checkPushSubscription();
    }
  }, [studyId, isDemo]);

  const checkPushSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription();
      setPushStatus(sub ? 'subscribed' : '');
    } catch { /* ignore */ }
  };

  const syncToServer = (newEnabled, newHour, newMinute) => {
    if (!isDemo && studyId) {
      sb.upsertNotifPrefs(studyId, {
        enabled: newEnabled,
        hour: newHour,
        minute: newMinute,
      });
    }
  };

  const subscribeToPush = async () => {
    if (!VAPID_PUBLIC_KEY || isDemo || !studyId) return false;
    try {
      setPushStatus('subscribing');
      const reg = await navigator.serviceWorker.ready;

      // Unsubscribe existing if any
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await sb.savePushSubscription(studyId, subscription);
      setPushStatus('subscribed');
      console.info('[Push] Subscribed successfully');
      return true;
    } catch (e) {
      console.error('[Push] Subscribe failed:', e);
      setPushStatus('error');
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (studyId) await sb.removePushSubscription(studyId, endpoint);
      }
      setPushStatus('');
    } catch (e) {
      console.error('[Push] Unsubscribe failed:', e);
    }
  };

  const supported = isNotificationSupported();

  const handleToggle = async () => {
    if (!enabled) {
      if (permission !== 'granted') {
        const result = await requestPermission();
        setPermission(result);
        if (result !== 'granted') return;
      }
      setNotificationsEnabled(true);
      setEnabled(true);
      setJustEnabled(true);
      syncToServer(true, time.hour, time.minute);

      // Subscribe to Web Push
      await subscribeToPush();

      setTimeout(() => setJustEnabled(false), 2000);
    } else {
      setNotificationsEnabled(false);
      setEnabled(false);
      syncToServer(false, time.hour, time.minute);

      // Unsubscribe from Web Push
      await unsubscribeFromPush();
    }
  };

  const handleTestNotification = async () => {
    if (testStatus === 'countdown') return; // ignore double-tap
    if (permission !== 'granted') {
      setTestStatus('denied');
      setTimeout(() => setTestStatus(''), 4000);
      return;
    }

    setTestStatus('countdown');
    // Count down 3 → 2 → 1 so the user knows when to switch to background.
    for (let n = 3; n > 0; n--) {
      setCountdown(n);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(0);

    const result = await showReminderNotification();
    if (result?.fired) {
      setTestStatus('fired');
    } else {
      setTestStatus('failed');
    }
    setTimeout(() => setTestStatus(''), 5000);
  };

  const timeValue = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  if (!supported) return null;

  if (permission === 'denied') {
    return (
      <div className="card notif-card">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'var(--danger-dim)' }}>🔕</div>
          <div>
            <div className="card-title">每日提醒</div>
            <span className="status-badge" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
              通知已被封鎖
            </span>
          </div>
        </div>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', margin: 0 }}>
          請至瀏覽器設定中重新開啟通知權限，才能收到每日提醒。
        </p>
      </div>
    );
  }

  return (
    <div className="card notif-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: enabled ? 'var(--accent-dim)' : 'var(--bg-glass)' }}>
          {enabled ? '🔔' : '🔕'}
        </div>
        <div style={{ flex: 1 }}>
          <div className="card-title">每日提醒</div>
          {enabled && (
            <span className="status-badge completed" style={{ fontSize: '0.65rem' }}>
              {pushStatus === 'subscribed' ? '✓ 推播已開啟' : '✓ 已開啟'}
            </span>
          )}
        </div>

        <button
          className={`notif-toggle ${enabled ? 'active' : ''}`}
          onClick={handleToggle}
          aria-label={enabled ? '關閉通知' : '開啟通知'}
        >
          <span className="notif-toggle-knob" />
        </button>
      </div>

      {!enabled && (
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          開啟後，即使未開啟 App，系統也會在設定時間推播通知提醒您填寫症狀回報。
        </p>
      )}

      {enabled && (
        <div className="notif-settings">
          <div className="notif-time-row">
            <label htmlFor="reminder-hour" className="notif-time-label">提醒時間</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                id="reminder-hour"
                className="notif-time-input"
                value={time.hour}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setReminderTime(h, time.minute);
                  setTime({ hour: h, minute: time.minute });
                  syncToServer(enabled, h, time.minute);
                }}
                style={{ minWidth: 64 }}
                aria-label="提醒小時 (24 小時制)"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>:</span>
              <select
                className="notif-time-input"
                value={time.minute}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setReminderTime(time.hour, m);
                  setTime({ hour: time.hour, minute: m });
                  syncToServer(enabled, time.hour, m);
                }}
                style={{ minWidth: 64 }}
                aria-label="提醒分鐘"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginLeft: 4 }}>
                24h
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary notif-test-btn"
            onClick={handleTestNotification}
            disabled={testStatus === 'countdown'}
          >
            {testStatus === 'countdown'
              ? `⏳ ${countdown} 秒後發送，請切到背景…`
              : '🔔 測試通知'}
          </button>
          {testStatus === 'countdown' && (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--warning)', marginTop: 6, lineHeight: 1.4 }}>
              💡 Android 的 PWA 在前景時只會顯示 in-app 橫幅（不震動、不進通知列）。
              按 Home 鍵將 App 切到背景後，才會看到完整的系統通知 + 震動。
            </div>
          )}
          {testStatus === 'fired' && (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--success)', marginTop: 6 }}>
              ✓ 測試通知已發送。若在前景只會看到橫幅，請切到背景測試完整效果。
            </div>
          )}
          {testStatus === 'denied' && (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--warning)', marginTop: 6, lineHeight: 1.4 }}>
              ⚠ 通知權限未授權。請先開啟上方每日提醒開關並允許通知權限。
            </div>
          )}
          {testStatus === 'failed' && (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--danger)', marginTop: 6 }}>
              ✗ 測試通知發送失敗，請檢查系統通知權限設定。
            </div>
          )}
          {justEnabled && (
            <div style={{
              fontSize: 'var(--font-xs)',
              color: 'var(--success)',
              marginTop: '6px',
              animation: 'fadeIn 0.3s ease',
            }}>
              ✓ 通知已開啟！每天 {timeValue} 若未回報將收到提醒。
            </div>
          )}
          {pushStatus === 'error' && (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--warning)', marginTop: '6px' }}>
              ⚠ 推播註冊失敗，將使用本機提醒作為備用。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
