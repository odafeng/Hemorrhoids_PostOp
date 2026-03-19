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

export default function NotificationSetup({ studyId, isDemo }) {
  const [permission, setPermission] = useState(getNotificationStatus());
  const [enabled, setEnabled] = useState(isNotificationsEnabled());
  const [time, setTime] = useState(getReminderTime());
  const [justEnabled, setJustEnabled] = useState(false);

  // On mount: load server prefs if available, merge into local state
  useEffect(() => {
    setPermission(getNotificationStatus());
    if (!isDemo && studyId) {
      sb.getNotifPrefs(studyId).then(prefs => {
        if (prefs) {
          setEnabled(prefs.enabled);
          setTime({ hour: prefs.hour, minute: prefs.minute });
          // Also update localStorage to keep in sync
          setNotificationsEnabled(prefs.enabled);
          setReminderTime(prefs.hour, prefs.minute);
        }
      });
    }
  }, [studyId, isDemo]);

  const syncToServer = (newEnabled, newHour, newMinute) => {
    if (!isDemo && studyId) {
      sb.upsertNotifPrefs(studyId, {
        enabled: newEnabled,
        hour: newHour,
        minute: newMinute,
      });
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
      setTimeout(() => setJustEnabled(false), 2000);
    } else {
      setNotificationsEnabled(false);
      setEnabled(false);
      syncToServer(false, time.hour, time.minute);
    }
  };

  const handleTimeChange = (e) => {
    const [h, m] = e.target.value.split(':').map(Number);
    setReminderTime(h, m);
    setTime({ hour: h, minute: m });
    syncToServer(enabled, h, m);
  };

  const handleTestNotification = () => {
    showReminderNotification();
  };

  const timeValue = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  // Not supported — don't render
  if (!supported) return null;

  // Permission denied — show info only
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
              ✓ 已開啟
            </span>
          )}
        </div>

        {/* Toggle switch */}
        <button
          className={`notif-toggle ${enabled ? 'active' : ''}`}
          onClick={handleToggle}
          aria-label={enabled ? '關閉通知' : '開啟通知'}
        >
          <span className="notif-toggle-knob" />
        </button>
      </div>

      {/* Explanation when off */}
      {!enabled && (
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          開啟提醒後，系統會在您設定的時間通知您填寫每日症狀回報。
        </p>
      )}

      {/* Settings when on */}
      {enabled && (
        <div className="notif-settings">
          <div className="notif-time-row">
            <label htmlFor="reminder-time" className="notif-time-label">提醒時間</label>
            <input
              id="reminder-time"
              type="time"
              className="notif-time-input"
              value={timeValue}
              onChange={handleTimeChange}
            />
          </div>
          <button className="btn btn-secondary notif-test-btn" onClick={handleTestNotification}>
            🔔 測試通知
          </button>
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
        </div>
      )}
    </div>
  );
}
