import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestQueryWrapper } from '../../test-utils';
import Dashboard from '../Dashboard';

vi.mock('../../utils/storage', () => ({
  getPOD: vi.fn().mockReturnValue(5),
  getTodayReport: vi.fn().mockReturnValue({
    date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false,
    wound: '無異常', urinary: '正常', continence: '正常', pod: 5,
  }),
  getAllReports: vi.fn().mockReturnValue([
    { date: '2026-03-14', pain: 7, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 0 },
    { date: '2026-03-15', pain: 8, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 1 },
    { date: '2026-03-16', pain: 9, bleeding: '持續', bowel: '未排', fever: false, wound: '腫脹', pod: 2 },
    { date: '2026-03-17', pain: 7, bleeding: '少量', bowel: '困難', fever: false, wound: '無異常', pod: 3 },
    { date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false, wound: '無異常', pod: 4 },
  ]),
  getSurgeryDate: vi.fn().mockReturnValue('2026-03-13'),
  getSurveyLocal: vi.fn().mockReturnValue(null),
}));

vi.mock('../../utils/supabaseService', () => ({
  getPatient: vi.fn(),
  getTodayReport: vi.fn(),
  getAllReports: vi.fn(),
  getPODFromDate: vi.fn(),
  getSurvey: vi.fn().mockResolvedValue(null),
  getAlerts: vi.fn().mockResolvedValue([]),
  getPendingNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../components/NotificationSetup', () => ({
  default: () => <div data-testid="notification-setup">NotifSetup</div>,
}));

vi.mock('../../components/DebugPanel', () => ({
  default: () => <div data-testid="debug-panel">DebugPanel</div>,
}));

describe('Dashboard Page (Demo Mode)', () => {
  const defaultProps = {
    onNavigate: vi.fn(),
    isDemo: true,
    userInfo: { studyId: 'DEMO-001', pod: 5, role: 'patient', surgeryDate: '2026-03-13' },
    onLogout: vi.fn(),
    onSyncSurgeryDate: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onNavigate.mockClear();
    defaultProps.onLogout.mockClear();
    defaultProps.onSyncSurgeryDate.mockClear();
  });

  it('renders brand title', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('術後追蹤系統')).toBeInTheDocument());
  });

  it('displays surgery date', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/2026-03-13/)).toBeInTheDocument());
  });

  it('shows Demo badge', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/DEMO/)).toBeInTheDocument());
  });

  it('displays POD counter', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/術後天數/)).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows today report as completed', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('已完成今日回報')).toBeInTheDocument());
  });

  it('displays today symptom values', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
    expect(screen.getAllByText('少量').length).toBeGreaterThan(0);
    expect(screen.getAllByText('正常').length).toBeGreaterThan(0);
  });

  it('shows adherence rate', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/回報率/)).toBeInTheDocument());
  });

  it('renders logout button (accessible)', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByLabelText('登出')).toBeInTheDocument());
  });

  it('renders quick action buttons', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/歷史紀錄/)).toBeInTheDocument());
    expect(screen.getAllByText(/AI 衛教/).length).toBeGreaterThan(0);
  });

  it('calls onLogout when logout button is clicked', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByLabelText('登出')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('登出'));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });

  it('navigates to report page on "填寫今日症狀回報" click', async () => {
    const storage = await import('../../utils/storage');
    storage.getTodayReport.mockReturnValue(null);

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/填寫今日症狀回報/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/填寫今日症狀回報/));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('report');

    storage.getTodayReport.mockReturnValue({
      date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false,
      wound: '無異常', urinary: '正常', continence: '正常', pod: 5,
    });
  });

  it('navigates to history on quick action click', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/歷史紀錄/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/歷史紀錄/));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('history');
  });

  it('navigates to chat on quick action click', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    const chatBtn = await screen.findAllByText(/AI 衛教/);
    await waitFor(() => expect(chatBtn.length).toBeGreaterThan(0));
    // Click the button (second one is the quick action button)
    fireEvent.click(chatBtn[chatBtn.length - 1]);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('chat');
  });

  it('shows "修改今日回報" button when today report exists', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/修改今日回報/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/修改今日回報/));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('report');
  });

  it('shows sync button and handles click', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/重新同步資料/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/重新同步資料/));
  });

  it('displays POD 0 as "OP"', async () => {
    const storage = await import('../../utils/storage');
    storage.getPOD.mockReturnValue(0);
    // Override surgeryDate to today so calculated pod = 0
    const propsPOD0 = { ...defaultProps, userInfo: { ...defaultProps.userInfo, surgeryDate: new Date().toLocaleDateString('en-CA') } };

    render(<Dashboard {...propsPOD0} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByText('OP')).toBeInTheDocument();
      expect(screen.getByText(/手術當日/)).toBeInTheDocument();
    });

    storage.getPOD.mockReturnValue(5);
  });

  it('shows today report with abnormal wound', async () => {
    const storage = await import('../../utils/storage');
    storage.getTodayReport.mockReturnValue({
      date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false,
      wound: '腫脹,分泌物', urinary: '困難', continence: '滲便', pod: 5,
    });

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByText('腫脹、分泌物')).toBeInTheDocument();
      expect(screen.getByText('困難')).toBeInTheDocument();
      expect(screen.getByText('滲便')).toBeInTheDocument();
    });

    storage.getTodayReport.mockReturnValue({
      date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false,
      wound: '無異常', urinary: '正常', continence: '正常', pod: 5,
    });
  });

  it('shows fever in today report', async () => {
    const storage = await import('../../utils/storage');
    storage.getTodayReport.mockReturnValue({
      date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: true,
      wound: '無異常', urinary: '正常', continence: '正常', pod: 5,
    });

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByText('是')).toBeInTheDocument();
    });

    storage.getTodayReport.mockReturnValue({
      date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false,
      wound: '無異常', urinary: '正常', continence: '正常', pod: 5,
    });
  });

  it('displays latest pain section', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/最新疼痛/)).toBeInTheDocument());
  });

  it('renders NotificationSetup and DebugPanel', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByTestId('notification-setup')).toBeInTheDocument();
      expect(screen.getByTestId('debug-panel')).toBeInTheDocument();
    });
  });

  it('shows survey prompt when POD >= 14 and not done', async () => {
    const storage = await import('../../utils/storage');
    storage.getPOD.mockReturnValue(15);

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByText(/填寫問卷/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/填寫問卷/));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('survey');

    storage.getPOD.mockReturnValue(5);
  });

  it('calls onSyncSurgeryDate when data loads', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(defaultProps.onSyncSurgeryDate).toHaveBeenCalledWith('2026-03-13');
    });
  });
});
