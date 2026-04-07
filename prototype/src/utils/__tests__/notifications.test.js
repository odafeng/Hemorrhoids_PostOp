import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to set up browser APIs before importing the module
beforeEach(() => {
  localStorage.clear();
});

describe('notifications', () => {
  let mod;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Helper to import fresh module
  const importModule = async () => {
    mod = await import('../notifications');
    return mod;
  };

  // =====================
  // Permission helpers
  // =====================
  describe('isNotificationSupported', () => {
    it('returns true when Notification and serviceWorker are available', async () => {
      globalThis.Notification = { permission: 'default', requestPermission: vi.fn() };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        configurable: true,
      });
      const { isNotificationSupported } = await importModule();
      expect(isNotificationSupported()).toBe(true);
    });

    it('returns false when Notification API is missing', async () => {
      delete globalThis.Notification;
      // serviceWorker still present
      const { isNotificationSupported } = await importModule();
      expect(isNotificationSupported()).toBe(false);
    });
  });

  describe('getNotificationStatus', () => {
    it('returns current permission when supported', async () => {
      globalThis.Notification = { permission: 'granted', requestPermission: vi.fn() };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        configurable: true,
      });
      const { getNotificationStatus } = await importModule();
      expect(getNotificationStatus()).toBe('granted');
    });

    it('returns "unsupported" when not supported', async () => {
      delete globalThis.Notification;
      const { getNotificationStatus } = await importModule();
      expect(getNotificationStatus()).toBe('unsupported');
    });
  });

  describe('requestPermission', () => {
    it('returns "unsupported" when not supported', async () => {
      delete globalThis.Notification;
      const { requestPermission } = await importModule();
      const result = await requestPermission();
      expect(result).toBe('unsupported');
    });

    it('delegates to Notification.requestPermission when supported', async () => {
      globalThis.Notification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        configurable: true,
      });
      const { requestPermission } = await importModule();
      const result = await requestPermission();
      expect(result).toBe('granted');
      expect(Notification.requestPermission).toHaveBeenCalled();
    });
  });

  // =====================
  // Preferences
  // =====================
  describe('preferences', () => {
    beforeEach(() => {
      globalThis.Notification = { permission: 'granted', requestPermission: vi.fn() };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        configurable: true,
      });
    });

    it('isNotificationsEnabled returns false by default', async () => {
      const { isNotificationsEnabled } = await importModule();
      expect(isNotificationsEnabled()).toBe(false);
    });

    it('setNotificationsEnabled toggles enabled state', async () => {
      const { isNotificationsEnabled, setNotificationsEnabled } = await importModule();
      setNotificationsEnabled(true);
      expect(isNotificationsEnabled()).toBe(true);
      setNotificationsEnabled(false);
      expect(isNotificationsEnabled()).toBe(false);
    });

    it('getReminderTime returns defaults 20:00', async () => {
      const { getReminderTime } = await importModule();
      expect(getReminderTime()).toEqual({ hour: 20, minute: 0 });
    });

    it('setReminderTime saves custom time', async () => {
      const { getReminderTime, setReminderTime } = await importModule();
      setReminderTime(8, 30);
      expect(getReminderTime()).toEqual({ hour: 8, minute: 30 });
    });

    it('handles corrupt localStorage gracefully', async () => {
      localStorage.setItem('notification_prefs', '{invalid json');
      const { isNotificationsEnabled, getReminderTime } = await importModule();
      expect(isNotificationsEnabled()).toBe(false);
      expect(getReminderTime()).toEqual({ hour: 20, minute: 0 });
    });
  });

  // =====================
  // showReminderNotification
  // =====================
  describe('showReminderNotification', () => {
    it('does nothing when permission is not granted', async () => {
      globalThis.Notification = { permission: 'default', requestPermission: vi.fn() };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        configurable: true,
      });
      const { showReminderNotification } = await importModule();
      await showReminderNotification(); // should not throw
    });

    it('shows SW notification when permission is granted', async () => {
      const showNotification = vi.fn().mockResolvedValue(undefined);
      globalThis.Notification = { permission: 'granted', requestPermission: vi.fn() };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification }) },
        configurable: true,
      });
      const { showReminderNotification } = await importModule();
      await showReminderNotification();
      expect(showNotification).toHaveBeenCalledWith('術後追蹤提醒 🏥', expect.objectContaining({
        tag: 'daily-reminder',
      }));
    });

    it('falls back to direct Notification when SW fails', async () => {
      globalThis.Notification = vi.fn();
      globalThis.Notification.permission = 'granted';
      globalThis.Notification.requestPermission = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification: vi.fn().mockRejectedValue(new Error('SW fail')) }) },
        configurable: true,
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { showReminderNotification } = await importModule();
      await showReminderNotification();
      expect(globalThis.Notification).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // =====================
  // Scheduler
  // =====================
  describe('startReminderScheduler / stopReminderScheduler', () => {
    beforeEach(() => {
      globalThis.Notification = { permission: 'granted', requestPermission: vi.fn() };
      const showNotification = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification }) },
        configurable: true,
      });
    });

    it('does nothing if notifications are not enabled', async () => {
      const { startReminderScheduler, stopReminderScheduler } = await importModule();
      const checkFn = vi.fn().mockResolvedValue(false);
      startReminderScheduler(checkFn);
      await vi.advanceTimersByTimeAsync(100);
      // checkFn should not be called because enabled is false
      expect(checkFn).not.toHaveBeenCalled();
      stopReminderScheduler();
    });

    it('fires notification when time is past and not yet reported', async () => {
      vi.setSystemTime(new Date('2026-03-18T21:00:00')); // 21:00, past default 20:00
      const { startReminderScheduler, stopReminderScheduler, setNotificationsEnabled } = await importModule();
      setNotificationsEnabled(true);
      const checkFn = vi.fn().mockResolvedValue(false); // not reported
      startReminderScheduler(checkFn);
      await vi.advanceTimersByTimeAsync(100);
      expect(checkFn).toHaveBeenCalled();
      stopReminderScheduler();
    });

    it('does not fire notification when already reported', async () => {
      vi.setSystemTime(new Date('2026-03-18T21:00:00'));
      const showNotification = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification }) },
        configurable: true,
      });
      const { startReminderScheduler, stopReminderScheduler, setNotificationsEnabled } = await importModule();
      setNotificationsEnabled(true);
      const checkFn = vi.fn().mockResolvedValue(true); // already reported
      startReminderScheduler(checkFn);
      await vi.advanceTimersByTimeAsync(100);
      expect(showNotification).not.toHaveBeenCalled();
      stopReminderScheduler();
    });

    it('does not fire if not yet reminder time', async () => {
      vi.setSystemTime(new Date('2026-03-18T10:00:00')); // 10:00, before 20:00
      const { startReminderScheduler, stopReminderScheduler, setNotificationsEnabled } = await importModule();
      setNotificationsEnabled(true);
      const checkFn = vi.fn().mockResolvedValue(false);
      startReminderScheduler(checkFn);
      await vi.advanceTimersByTimeAsync(100);
      expect(checkFn).not.toHaveBeenCalled();
      stopReminderScheduler();
    });

    it('does not send duplicate notification same day', async () => {
      vi.setSystemTime(new Date('2026-03-18T21:00:00'));
      const { startReminderScheduler, stopReminderScheduler, setNotificationsEnabled } = await importModule();
      setNotificationsEnabled(true);
      const checkFn = vi.fn().mockResolvedValue(false);
      startReminderScheduler(checkFn);
      await vi.advanceTimersByTimeAsync(100);
      // First call done — now advance 15 min interval
      checkFn.mockClear();
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      // checkFn should NOT be called again (lastNotificationDate set)
      expect(checkFn).not.toHaveBeenCalled();
      stopReminderScheduler();
    });

    it('stopReminderScheduler clears interval', async () => {
      const { startReminderScheduler, stopReminderScheduler } = await importModule();
      startReminderScheduler(vi.fn());
      stopReminderScheduler();
      // no error, just verifying it doesn't throw
    });

    it('handles checkReportedFn throwing error gracefully', async () => {
      vi.setSystemTime(new Date('2026-03-18T21:00:00'));
      const { startReminderScheduler, stopReminderScheduler, setNotificationsEnabled } = await importModule();
      setNotificationsEnabled(true);
      const checkFn = vi.fn().mockRejectedValue(new Error('network error'));
      startReminderScheduler(checkFn);
      await vi.advanceTimersByTimeAsync(100);
      // Should not throw
      expect(checkFn).toHaveBeenCalled();
      stopReminderScheduler();
    });
  });
});
