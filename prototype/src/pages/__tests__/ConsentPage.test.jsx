import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentPage from '../ConsentPage';

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
  left: 0, top: 0, width: 300, height: 140, right: 300, bottom: 140,
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
        userInfo={{ studyId: 'HSF-003' }}
        onConsent={onConsent}
        onDecline={onDecline}
      />
    );

  const scrollToBottom = (container) => {
    const scrollDiv = container.querySelector('.c-fulltext');
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollTop', { value: 980, configurable: true });
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 30, configurable: true });
    fireEvent.scroll(scrollDiv);
  };

  const simulateSignature = (container) => {
    const canvas = container.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 40, clientY: 30 });
    fireEvent.mouseUp(canvas);
  };

  it('renders consent title and IRB eyebrow', () => {
    renderPage();
    expect(screen.getByText('研究知情同意書')).toBeInTheDocument();
    expect(screen.getByText(/IRB-2026-CRS-041/)).toBeInTheDocument();
    expect(screen.getByText(/痔瘡手術術後 AI 衛教系統之可行性研究/)).toBeInTheDocument();
  });

  it('shows scroll hint initially; checkboxes are disabled', () => {
    renderPage();
    expect(screen.getByText(/請滑至.+最底部以解鎖勾選/)).toBeInTheDocument();
    screen.getAllByRole('checkbox').forEach((cb) => expect(cb).toBeDisabled());
  });

  it('scroll-to-bottom enables the four checkboxes', () => {
    const { container } = renderPage();
    scrollToBottom(container);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((cb) => expect(cb).not.toBeDisabled());
    expect(screen.queryByText(/請滑至.+最底部以解鎖勾選/)).not.toBeInTheDocument();
  });

  it('submit button is disabled until scroll + all checks + signature', () => {
    const { container } = renderPage();
    const submitBtn = screen.getByText(/簽署並開始/);
    expect(submitBtn).toBeDisabled();

    scrollToBottom(container);
    expect(submitBtn).toBeDisabled();

    screen.getAllByRole('checkbox').forEach((cb) => fireEvent.click(cb));
    expect(submitBtn).toBeDisabled();

    simulateSignature(container);
    expect(submitBtn).not.toBeDisabled();
  });

  it('clicking 拒絕 calls onDecline', () => {
    renderPage();
    fireEvent.click(screen.getByText('拒絕'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('clicking 清除重簽 removes the signature and re-disables submit', () => {
    const { container } = renderPage();
    scrollToBottom(container);
    screen.getAllByRole('checkbox').forEach((cb) => fireEvent.click(cb));
    simulateSignature(container);

    expect(screen.getByText(/簽署並開始/)).not.toBeDisabled();

    fireEvent.click(screen.getByText('清除重簽'));
    expect(screen.getByText(/簽署並開始/)).toBeDisabled();
  });

  it('submitting calls onConsent with signature dataURL', async () => {
    const { container } = renderPage();
    scrollToBottom(container);
    screen.getAllByRole('checkbox').forEach((cb) => fireEvent.click(cb));
    simulateSignature(container);

    fireEvent.click(screen.getByText(/簽署並開始/));
    expect(onConsent).toHaveBeenCalledWith('data:image/png;base64,fake');
  });

  it('renders institution "高雄榮民總醫院" in consent fulltext', () => {
    renderPage();
    expect(screen.getByText(/高雄榮民總醫院/)).toBeInTheDocument();
  });

  it('shows study ID in signature meta', () => {
    renderPage();
    expect(screen.getByText('HSF-003')).toBeInTheDocument();
  });
});
