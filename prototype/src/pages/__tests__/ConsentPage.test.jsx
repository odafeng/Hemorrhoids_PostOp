import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsentPage from '../ConsentPage';

// Mock canvas getContext for jsdom
const mockCtx = {
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
};
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
  left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150,
}));
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,fake');

describe('ConsentPage', () => {
  let onConsent;
  let onDecline;

  beforeEach(() => {
    onConsent = vi.fn().mockResolvedValue(undefined);
    onDecline = vi.fn();
  });

  const renderPage = () =>
    render(
      <ConsentPage
        userInfo={{ name: 'Test User' }}
        onConsent={onConsent}
        onDecline={onDecline}
      />
    );

  // Helper: simulate scrolling to the bottom of the consent text container
  const scrollToBottom = (container) => {
    const scrollDiv = container.querySelector('[style*="overflow"]');
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollTop', { value: 970, configurable: true });
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 30, configurable: true });
    fireEvent.scroll(scrollDiv);
  };

  it('renders consent title and text', () => {
    renderPage();
    expect(screen.getByText('研究知情同意書')).toBeInTheDocument();
    expect(screen.getByText(/痔瘡手術術後 AI 衛教系統之可行性研究/)).toBeInTheDocument();
  });

  it('shows "請滑至最底部以繼續" initially', () => {
    renderPage();
    expect(screen.getByText(/請滑至最底部以繼續/)).toBeInTheDocument();
  });

  it('checkbox and next button appear after scroll to bottom', () => {
    const { container } = renderPage();

    // Before scroll: no checkbox or next button
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('下一步：簽署同意書')).not.toBeInTheDocument();

    scrollToBottom(container);

    // After scroll: checkbox and button should appear
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('下一步：簽署同意書')).toBeInTheDocument();
    // Scroll hint should disappear
    expect(screen.queryByText(/請滑至最底部以繼續/)).not.toBeInTheDocument();
  });

  it('checkbox is unchecked by default, button disabled', () => {
    const { container } = renderPage();
    scrollToBottom(container);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    const nextBtn = screen.getByText('下一步：簽署同意書');
    expect(nextBtn).toBeDisabled();
  });

  it('checking checkbox enables next button', () => {
    const { container } = renderPage();
    scrollToBottom(container);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText('下一步：簽署同意書')).not.toBeDisabled();
  });

  it('clicking "暫不簽署，返回登入" calls onDecline', () => {
    renderPage();
    fireEvent.click(screen.getByText('暫不簽署，返回登入'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('clicking next shows signature canvas area', () => {
    const { container } = renderPage();
    scrollToBottom(container);

    // Check and click next
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('下一步：簽署同意書'));

    // Signature area should appear
    expect(screen.getByText('請在下方空白處手寫簽名')).toBeInTheDocument();
    expect(screen.getByText('清除重簽')).toBeInTheDocument();
    expect(screen.getByText('確認簽署')).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('"確認簽署" button is disabled without signature', () => {
    const { container } = renderPage();
    scrollToBottom(container);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('下一步：簽署同意書'));

    const submitBtn = screen.getByText('確認簽署');
    expect(submitBtn).toBeDisabled();
  });

  it('renders institution name "高雄榮民總醫院"', () => {
    renderPage();
    expect(screen.getByText(/高雄榮民總醫院/)).toBeInTheDocument();
  });
});
