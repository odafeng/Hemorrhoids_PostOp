import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SymptomReport from '../SymptomReport';

// Mock supabaseService
vi.mock('../../utils/supabaseService', () => ({
  saveReport: vi.fn().mockResolvedValue({}),
  getAllReports: vi.fn().mockResolvedValue([]),
  createAlert: vi.fn().mockResolvedValue({}),
}));

// Mock storage for demo mode
vi.mock('../../utils/storage', () => ({
  getTodayReport: vi.fn().mockReturnValue(null),
  saveReport: vi.fn().mockReturnValue({ date: '2026-03-18', pain: 5 }),
  getPOD: vi.fn().mockReturnValue(5),
}));

describe('SymptomReport Page', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    isDemo: true,
    userInfo: { studyId: 'DEMO-001', pod: 5, role: 'patient' },
  };

  beforeEach(() => {
    defaultProps.onComplete.mockClear();
  });

  it('renders page title and subtitle', () => {
    render(<SymptomReport {...defaultProps} />);
    expect(screen.getByText('症狀回報')).toBeInTheDocument();
    expect(screen.getByText(/約 30 秒/)).toBeInTheDocument();
  });

  it('renders pain slider with initial value', () => {
    render(<SymptomReport {...defaultProps} />);
    expect(screen.getByText('疼痛分數')).toBeInTheDocument();
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider.value).toBe('3'); // default
  });

  it('renders all bleeding options', () => {
    render(<SymptomReport {...defaultProps} />);
    expect(screen.getByText('無')).toBeInTheDocument();
    expect(screen.getByText('少量')).toBeInTheDocument();
    expect(screen.getByText('持續')).toBeInTheDocument();
    expect(screen.getByText('血塊')).toBeInTheDocument();
  });

  it('renders all bowel options', () => {
    render(<SymptomReport {...defaultProps} />);
    expect(screen.getByText('正常')).toBeInTheDocument();
    expect(screen.getByText('困難')).toBeInTheDocument();
    expect(screen.getByText('未排')).toBeInTheDocument();
  });

  it('renders fever toggle', () => {
    render(<SymptomReport {...defaultProps} />);
    expect(screen.getByText('發燒')).toBeInTheDocument();
    expect(screen.getByText('否')).toBeInTheDocument();
    expect(screen.getByText('是')).toBeInTheDocument();
  });

  it('renders all wound options', () => {
    render(<SymptomReport {...defaultProps} />);
    expect(screen.getByText('無異常')).toBeInTheDocument();
    expect(screen.getByText('腫脹')).toBeInTheDocument();
    expect(screen.getByText('分泌物')).toBeInTheDocument();
  });

  it('submit button is disabled when required fields are not selected', () => {
    render(<SymptomReport {...defaultProps} />);
    const submit = screen.getByText('提交回報');
    expect(submit).toBeDisabled();
  });

  it('submit button becomes enabled after selecting all required fields', () => {
    render(<SymptomReport {...defaultProps} />);

    // Select bleeding option
    fireEvent.click(screen.getByText('少量'));
    // Select bowel option
    fireEvent.click(screen.getByText('正常'));
    // Select wound option
    fireEvent.click(screen.getByText('無異常'));

    const submit = screen.getByText('提交回報');
    expect(submit).not.toBeDisabled();
  });

  it('shows success overlay after submission in demo mode', async () => {
    render(<SymptomReport {...defaultProps} />);

    // Fill form
    fireEvent.click(screen.getByText('少量'));
    fireEvent.click(screen.getByText('正常'));
    fireEvent.click(screen.getByText('無異常'));

    // Submit
    fireEvent.click(screen.getByText('提交回報'));

    await waitFor(() => {
      expect(screen.getByText('回報成功')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays pain level text correctly', () => {
    render(<SymptomReport {...defaultProps} />);
    // Default pain is 3, should show '輕度疼痛'
    expect(screen.getByText('輕度疼痛')).toBeInTheDocument();
  });
});
