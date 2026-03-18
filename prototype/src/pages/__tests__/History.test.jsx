import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TestQueryWrapper } from '../../test-utils';
import History from '../History';

// Mock storage for demo mode
vi.mock('../../utils/storage', () => {
  let mockReports = [
    { date: '2026-03-14', pain: 7, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 0 },
    { date: '2026-03-15', pain: 8, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 1 },
    { date: '2026-03-16', pain: 9, bleeding: '持續', bowel: '未排', fever: false, wound: '腫脹', pod: 2 },
    { date: '2026-03-17', pain: 7, bleeding: '少量', bowel: '困難', fever: false, wound: '無異常', pod: 3 },
    { date: '2026-03-18', pain: 4, bleeding: '無', bowel: '正常', fever: false, wound: '無異常', pod: 4 },
  ];
  return {
    getAllReports: vi.fn(() => mockReports),
    __setMockReports: (reports) => { mockReports = reports; },
  };
});

// Mock supabaseService
vi.mock('../../utils/supabaseService', () => ({
  getAllReports: vi.fn().mockResolvedValue([]),
}));

describe('History Page (Demo Mode)', () => {
  const defaultProps = {
    isDemo: true,
    userInfo: { studyId: 'DEMO-001', pod: 5, role: 'patient' },
  };

  it('renders page title', async () => {
    render(<History {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('歷史紀錄')).toBeInTheDocument());
  });

  it('displays total report count', async () => {
    render(<History {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/已完成 5 次回報/)).toBeInTheDocument());
  });

  it('renders pain trend chart title', async () => {
    render(<History {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/疼痛趨勢/)).toBeInTheDocument());
  });

  it('renders timeline items for each report', async () => {
    render(<History {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText(/POD 0/)).toBeInTheDocument());
    expect(screen.getByText(/POD 4/)).toBeInTheDocument();
  });

  it('shows pain values in timeline (using getAllByText for duplicates)', async () => {
    render(<History {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      const sevens = screen.getAllByText('7/10');
      expect(sevens.length).toBe(2);
    });
    expect(screen.getByText('4/10')).toBeInTheDocument();
    expect(screen.getByText('9/10')).toBeInTheDocument();
  });

  it('renders SVG chart for pain trend', async () => {
    const { container } = render(<History {...defaultProps} />, { wrapper: TestQueryWrapper });
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});

describe('History Page (Empty State)', () => {
  it('shows empty state when no reports', async () => {
    const storage = await import('../../utils/storage');
    storage.__setMockReports([]);

    render(<History isDemo={true} userInfo={{ studyId: 'DEMO-001' }} />, { wrapper: TestQueryWrapper });
    await waitFor(() => expect(screen.getByText('尚無回報紀錄')).toBeInTheDocument());

    // Restore
    storage.__setMockReports([
      { date: '2026-03-14', pain: 7, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 0 },
      { date: '2026-03-15', pain: 8, bleeding: '少量', bowel: '未排', fever: false, wound: '腫脹', pod: 1 },
      { date: '2026-03-16', pain: 9, bleeding: '持續', bowel: '未排', fever: false, wound: '腫脹', pod: 2 },
      { date: '2026-03-17', pain: 7, bleeding: '少量', bowel: '困難', fever: false, wound: '無異常', pod: 3 },
      { date: '2026-03-18', pain: 4, bleeding: '無', bowel: '正常', fever: false, wound: '無異常', pod: 4 },
    ]);
  });
});
