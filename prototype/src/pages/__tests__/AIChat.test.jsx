import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIChat from '../AIChat';

// Mock storage for demo mode
vi.mock('../../utils/storage', () => ({
  getChatHistory: vi.fn().mockReturnValue([]),
  saveChatMessage: vi.fn(),
}));

// Mock supabaseService
vi.mock('../../utils/supabaseService', () => ({
  getChatLogs: vi.fn().mockResolvedValue([]),
  saveChatLog: vi.fn().mockResolvedValue({}),
}));

describe('AIChat Page', () => {
  const defaultProps = {
    isDemo: true,
    userInfo: { studyId: 'DEMO-001', pod: 5, role: 'patient' },
  };

  it('renders disclaimer banner', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByText(/僅提供衛教資訊/)).toBeInTheDocument();
  });

  it('renders welcome message', async () => {
    render(<AIChat {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/術後衛教 AI 助手/)).toBeInTheDocument();
    });
  });

  it('renders quick question buttons', async () => {
    render(<AIChat {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('術後疼痛怎麼辦？')).toBeInTheDocument();
      expect(screen.getByText('出血正常嗎？')).toBeInTheDocument();
      expect(screen.getByText('排便困難怎麼辦？')).toBeInTheDocument();
    });
  });

  it('renders input field and send button', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByPlaceholderText('輸入您的問題...')).toBeInTheDocument();
    const sendBtn = screen.getByText('➤');
    expect(sendBtn).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<AIChat {...defaultProps} />);
    const sendBtn = screen.getByText('➤');
    expect(sendBtn).toBeDisabled();
  });

  it('sends a message when quick question button is clicked', async () => {
    render(<AIChat {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('術後疼痛怎麼辦？')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('術後疼痛怎麼辦？'));

    // Should show typing indicator briefly, then AI response
    await waitFor(() => {
      // The user message should appear as a bubble
      const userBubbles = screen.getAllByText('術後疼痛怎麼辦？');
      expect(userBubbles.length).toBeGreaterThanOrEqual(1);
    });

    // Wait for AI response (with delay)
    await waitFor(() => {
      expect(screen.getByText(/止痛/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('saves chat messages in demo mode', async () => {
    const { saveChatMessage } = await import('../../utils/storage');
    saveChatMessage.mockClear();

    render(<AIChat {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('術後疼痛怎麼辦？')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('術後疼痛怎麼辦？'));

    await waitFor(() => {
      expect(saveChatMessage).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
