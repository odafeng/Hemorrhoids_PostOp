import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TestQueryWrapper } from '../../test-utils';
import Dashboard from '../Dashboard';

// Mock storage for demo mode
vi.mock('../../utils/storage', () => ({
  getPOD: vi.fn().mockReturnValue(5),
  getTodayReport: vi.fn().mockReturnValue({
    date: '2026-03-18', pain: 4, bleeding: '少量', bowel: '正常', fever: false, wound: '無異常', pod: 5,
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
}));

describe('Dashboard Page (Demo Mode)', () => {
  const defaultProps = {
    onNavigate: vi.fn(),
    isDemo: true,
    userInfo: { studyId: 'DEMO-001', pod: 5, role: 'patient' },
    onLogout: vi.fn(),
  };

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
    await waitFor(() => expect(screen.getByText(/查看紀錄/)).toBeInTheDocument());
    expect(screen.getByText(/AI 衛教/)).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', async () => {
    render(<Dashboard {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('登出')).toBeInTheDocument());
    screen.getByText('登出').click();
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
