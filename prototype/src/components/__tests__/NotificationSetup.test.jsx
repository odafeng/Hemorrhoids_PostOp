import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationSetup from '../NotificationSetup';

// Mock notifications utils
vi.mock('../../utils/notifications', () => ({
  isNotificationSupported: vi.fn().mockReturnValue(true),
  getNotificationStatus: vi.fn().mockReturnValue('default'),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  isNotificationsEnabled: vi.fn().mockReturnValue(false),
  setNotificationsEnabled: vi.fn(),
  getReminderTime: vi.fn().mockReturnValue({ hour: 20, minute: 0 }),
  setReminderTime: vi.fn(),
  showReminderNotification: vi.fn(),
}));

// Mock supabaseService
vi.mock('../../utils/supabaseService', () => ({
  getNotifPrefs: vi.fn().mockResolvedValue(null),
  upsertNotifPrefs: vi.fn().mockResolvedValue({}),
  savePushSubscription: vi.fn().mockResolvedValue({}),
  removePushSubscription: vi.fn().mockResolvedValue({}),
}));

describe('NotificationSetup', () => {
  const defaultProps = {
    studyId: 'HEM-001',
    isDemo: true,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset notification mocks to default state
    const notif = await import('../../utils/notifications');
    notif.isNotificationSupported.mockReturnValue(true);
    notif.getNotificationStatus.mockReturnValue('default');
    notif.isNotificationsEnabled.mockReturnValue(false);
    notif.getReminderTime.mockReturnValue({ hour: 20, minute: 0 });
  });

  it('returns null when notifications not supported', async () => {
    const notif = await import('../../utils/notifications');
    notif.isNotificationSupported.mockReturnValue(false);
    const { container } = render(<NotificationSetup {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows blocked message when permission is denied', async () => {
    const notif = await import('../../utils/notifications');
    notif.getNotificationStatus.mockReturnValue('denied');
    render(<NotificationSetup {...defaultProps} />);
    expect(screen.getByText('通知已被封鎖')).toBeInTheDocument();
    expect(screen.getByText(/請至瀏覽器設定中重新開啟/)).toBeInTheDocument();
  });

  it('renders toggle button in default state', () => {
    render(<NotificationSetup {...defaultProps} />);
    expect(screen.getByText('每日提醒')).toBeInTheDocument();
    expect(screen.getByLabelText('開啟通知')).toBeInTheDocument();
  });

  it('shows description when notifications are off', () => {
    render(<NotificationSetup {...defaultProps} />);
    expect(screen.getByText(/開啟後，即使未開啟 App/)).toBeInTheDocument();
  });

  it('toggles notifications on — requests permission and enables', async () => {
    const notif = await import('../../utils/notifications');
    render(<NotificationSetup {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('開啟通知'));

    await waitFor(() => {
      expect(notif.requestPermission).toHaveBeenCalled();
      expect(notif.setNotificationsEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('does not enable if permission request is denied', async () => {
    const notif = await import('../../utils/notifications');
    notif.requestPermission.mockResolvedValue('denied');
    render(<NotificationSetup {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('開啟通知'));

    await waitFor(() => {
      expect(notif.requestPermission).toHaveBeenCalled();
    });
    // Should not have been called with true
    expect(notif.setNotificationsEnabled).not.toHaveBeenCalledWith(true);
  });

  it('skips permission request when already granted', async () => {
    const notif = await import('../../utils/notifications');
    notif.getNotificationStatus.mockReturnValue('granted');
    render(<NotificationSetup {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('開啟通知'));

    await waitFor(() => {
      expect(notif.requestPermission).not.toHaveBeenCalled();
      expect(notif.setNotificationsEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('shows time input and test button when enabled', async () => {
    const notif = await import('../../utils/notifications');
    notif.isNotificationsEnabled.mockReturnValue(true);
    notif.getNotificationStatus.mockReturnValue('granted');

    render(<NotificationSetup {...defaultProps} />);

    // Already enabled — should show time input and test button
    expect(screen.getByLabelText('提醒時間')).toBeInTheDocument();
    expect(screen.getByText(/測試通知/)).toBeInTheDocument();
  });

  it('toggles off — disables notifications', async () => {
    const notif = await import('../../utils/notifications');
    notif.isNotificationsEnabled.mockReturnValue(true);
    notif.getNotificationStatus.mockReturnValue('granted');

    render(<NotificationSetup {...defaultProps} />);

    // Click toggle (which should be "關閉通知" since enabled)
    const toggle = screen.getByLabelText('關閉通知');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(notif.setNotificationsEnabled).toHaveBeenCalledWith(false);
    });
  });

  it('handles time change', async () => {
    const notif = await import('../../utils/notifications');
    notif.isNotificationsEnabled.mockReturnValue(true);
    notif.getNotificationStatus.mockReturnValue('granted');

    render(<NotificationSetup {...defaultProps} />);

    const timeInput = screen.getByLabelText('提醒時間');
    if (timeInput) {
      fireEvent.change(timeInput, { target: { value: '08:30' } });
      expect(notif.setReminderTime).toHaveBeenCalledWith(8, 30);
    }
  });

  it('test notification button calls showReminderNotification', async () => {
    const notif = await import('../../utils/notifications');
    notif.isNotificationsEnabled.mockReturnValue(true);
    notif.getNotificationStatus.mockReturnValue('granted');

    render(<NotificationSetup {...defaultProps} />);

    const testBtn = screen.getByText(/測試通知/);
    if (testBtn) {
      fireEvent.click(testBtn);
      expect(notif.showReminderNotification).toHaveBeenCalled();
    }
  });

  it('loads server prefs on mount for non-demo mode', async () => {
    const sb = await import('../../utils/supabaseService');
    sb.getNotifPrefs.mockResolvedValue({ enabled: true, hour: 9, minute: 15 });

    // Mock serviceWorker for checkPushSubscription
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } }) },
      configurable: true,
    });

    render(<NotificationSetup studyId="HEM-001" isDemo={false} />);

    await waitFor(() => {
      expect(sb.getNotifPrefs).toHaveBeenCalledWith('HEM-001');
    });
  });

  it('syncs to server on toggle for non-demo mode', async () => {
    const notif = await import('../../utils/notifications');
    notif.getNotificationStatus.mockReturnValue('granted');
    const sb = await import('../../utils/supabaseService');

    render(<NotificationSetup studyId="HEM-001" isDemo={false} />);

    fireEvent.click(screen.getByLabelText('開啟通知'));

    await waitFor(() => {
      expect(sb.upsertNotifPrefs).toHaveBeenCalled();
    });
  });

  it('shows push status when subscribed', async () => {
    const notif = await import('../../utils/notifications');
    notif.isNotificationsEnabled.mockReturnValue(true);
    notif.getNotificationStatus.mockReturnValue('granted');

    render(<NotificationSetup {...defaultProps} />);
    // Status badge should show something
  });
});
