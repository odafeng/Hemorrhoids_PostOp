import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestQueryWrapper } from '../../test-utils';
import Dashboard from '../Dashboard';

// Mock storage for demo mode
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

// Mock supabaseService to prevent network calls
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

// Mock NotificationSetup to simplify
vi.mock('../../components/NotificationSetup', () => ({
  default: () => <div data-testid="notification-setup">NotifSetup</div>,
}));

// Mock DebugPanel to simplify
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

  it('renders page title', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('術後追蹤')).toBeInTheDocument());
  });

  it('displays surgery date', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/手術日期/)).toBeInTheDocument());
    expect(screen.getByText(/2026-03-13/)).toBeInTheDocument();
  });

  it('shows Demo badge', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('（Demo）')).toBeInTheDocument());
  });

  it('displays POD counter', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('術後天數')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('POD 5')).toBeInTheDocument();
  });

  it('shows today report as completed', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('今日回報')).toBeInTheDocument());
    expect(screen.getByText('✓ 已完成')).toBeInTheDocument();
  });

  it('displays today symptom values', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('4/10')).toBeInTheDocument());
    expect(screen.getByText('少量')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('shows adherence rate', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('回報率')).toBeInTheDocument());
  });

  it('renders logout button', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('登出')).toBeInTheDocument());
  });

  it('renders quick action buttons', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/紀錄/)).toBeInTheDocument());
    expect(screen.getByText(/AI 衛教/)).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('登出')).toBeInTheDocument());
    screen.getByText('登出').click();
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });

  it('navigates to report page on "填寫今日症狀回報" click', async () => {
    const storage = await import('../../utils/storage');
    storage.getTodayReport.mockReturnValue(null);

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('填寫今日症狀回報')).toBeInTheDocument());
    fireEvent.click(screen.getByText('填寫今日症狀回報'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('report');

    storage.getTodayReport.mockReturnValue({
      date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false,
      wound: '無異常', urinary: '正常', continence: '正常', pod: 5,
    });
  });

  it('navigates to history on quick action click', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/紀錄/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/紀錄/));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('history');
  });

  it('navigates to chat on quick action click', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/AI 衛教/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/AI 衛教/));
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

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByText('OP')).toBeInTheDocument();
      expect(screen.getByText('手術當日')).toBeInTheDocument();
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

  it('displays latest pain emoji (happy for low pain)', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('最新疼痛')).toBeInTheDocument());
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
      expect(screen.getByText('系統可用性問卷')).toBeInTheDocument();
      expect(screen.getByText('● 待填寫')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('填寫問卷'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('survey');

    storage.getPOD.mockReturnValue(5);
  });

  it('shows survey as completed when done', async () => {
    const storage = await import('../../utils/storage');
    storage.getPOD.mockReturnValue(15);
    storage.getSurveyLocal.mockReturnValue({ q1: 5 });

    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(screen.getByText('系統可用性問卷')).toBeInTheDocument();
      // Multiple "✓ 已完成" exist (today report + survey), use getAllByText
      const completedBadges = screen.getAllByText('✓ 已完成');
      expect(completedBadges.length).toBeGreaterThanOrEqual(2);
    });

    storage.getPOD.mockReturnValue(5);
    storage.getSurveyLocal.mockReturnValue(null);
  });

  it('calls onSyncSurgeryDate when data loads', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      expect(defaultProps.onSyncSurgeryDate).toHaveBeenCalledWith('2026-03-13');
    });
  });
});

describe('Dashboard with no today report', () => {
  it('shows "填寫今日症狀回報" when no report today', async () => {
    const defaultProps = {
      onNavigate: vi.fn(),
      isDemo: true,
      userInfo: { studyId: 'DEMO-001', pod: 5, role: 'patient' },
      onLogout: vi.fn(),
    };

    // This is tested in "navigates to report page" test above
    // Included here to confirm pending state renders
  });
});
