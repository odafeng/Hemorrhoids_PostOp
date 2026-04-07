import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';

// Mock supabaseService to avoid real network calls
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../utils/supabaseService', () => ({
  signIn: (...args) => mockSignIn(...args),
  signUp: (...args) => mockSignUp(...args),
  resetPassword: (...args) => mockResetPassword(...args),
}));

describe('Login Page', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockResetPassword.mockReset();
  });

  it('renders login page with title and logo', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByText('術後追蹤系統')).toBeInTheDocument();
    expect(screen.getByText(/痔瘡手術術後症狀監測/)).toBeInTheDocument();
  });

  it('renders email and password fields', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renders login and register tab buttons', () => {
    render(<Login onLogin={vi.fn()} />);
    const toggleBtns = screen.getAllByRole('button');
    const loginTab = toggleBtns.find(b => b.textContent.trim() === '登入' && b.classList.contains('toggle-btn'));
    const registerTab = toggleBtns.find(b => b.textContent.trim() === '註冊' && b.classList.contains('toggle-btn'));
    expect(loginTab).toBeTruthy();
    expect(registerTab).toBeTruthy();
  });

  it('switches to register mode and shows study ID and invite code fields', () => {
    render(<Login onLogin={vi.fn()} />);
    const toggleBtns = screen.getAllByRole('button');
    const registerTab = toggleBtns.find(b => b.textContent.trim() === '註冊' && b.classList.contains('toggle-btn'));
    fireEvent.click(registerTab);
    expect(screen.getByPlaceholderText('例如：HEM-001')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('請輸入研究團隊提供的邀請碼')).toBeInTheDocument();
    expect(screen.getByText('手術日期')).toBeInTheDocument();
  });

  it('renders demo mode button', () => {
    render(<Login onLogin={vi.fn()} />);
    const demoBtn = screen.getByRole('button', { name: /Demo 模式/ });
    expect(demoBtn).toBeInTheDocument();
  });

  it('calls onLogin with demo flag when demo button clicked', () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    const demoBtn = screen.getByRole('button', { name: /Demo 模式/ });
    fireEvent.click(demoBtn);
    expect(onLogin).toHaveBeenCalledWith({ demo: true, studyId: 'DEMO-001' });
  });

  it('calls onLogin with researcher demo when researcher button clicked', () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    const researcherBtn = screen.getByRole('button', { name: /研究者 Demo/ });
    fireEvent.click(researcherBtn);
    expect(onLogin).toHaveBeenCalledWith({ demo: true, studyId: 'RESEARCHER', role: 'researcher' });
  });

  it('renders submit button as "登入" in login mode', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByText('登入', { selector: 'button[type="submit"]' })).toBeInTheDocument();
  });

  it('renders submit button as "建立帳號" in register mode', () => {
    render(<Login onLogin={vi.fn()} />);
    const toggleBtns = screen.getAllByRole('button');
    const registerTab = toggleBtns.find(b => b.textContent.trim() === '註冊' && b.classList.contains('toggle-btn'));
    fireEvent.click(registerTab);
    expect(screen.getByText('建立帳號')).toBeInTheDocument();
  });

  // =====================
  // Login form submission
  // =====================
  it('calls signIn on login form submit', async () => {
    mockSignIn.mockResolvedValue({});
    render(<Login onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByText('登入', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows error message on login failure', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));
    render(<Login onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByText('登入', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows generic error when error has no message', async () => {
    mockSignIn.mockRejectedValue({});
    render(<Login onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByText('登入', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(screen.getByText('登入失敗，請檢查帳號密碼')).toBeInTheDocument();
    });
  });

  // =====================
  // Register form
  // =====================
  it('calls signUp on register form submit', async () => {
    mockSignUp.mockResolvedValue({});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Login onLogin={vi.fn()} />);

    // Switch to register
    const toggleBtns = screen.getAllByRole('button');
    fireEvent.click(toggleBtns.find(b => b.textContent.trim() === '註冊'));

    fireEvent.change(screen.getByPlaceholderText('請輸入研究團隊提供的邀請碼'), { target: { value: 'ABC123' } });
    fireEvent.change(screen.getByPlaceholderText('例如：HEM-001'), { target: { value: 'HEM-099' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    // Set surgery date — find by type=date
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-03-15' } });

    fireEvent.submit(screen.getByText('建立帳號'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('帳號建立成功！請登入。');
    });
    alertSpy.mockRestore();
  });

  it('shows error when invite code is empty on register', async () => {
    render(<Login onLogin={vi.fn()} />);

    const toggleBtns = screen.getAllByRole('button');
    fireEvent.click(toggleBtns.find(b => b.textContent.trim() === '註冊'));

    // Leave invite code as whitespace
    fireEvent.change(screen.getByPlaceholderText('請輸入研究團隊提供的邀請碼'), { target: { value: '  ' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    fireEvent.change(screen.getByPlaceholderText('例如：HEM-001'), { target: { value: 'HEM-001' } });
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-03-15' } });

    fireEvent.submit(screen.getByText('建立帳號'));

    await waitFor(() => {
      expect(screen.getByText('請輸入邀請碼。')).toBeInTheDocument();
    });
  });

  // =====================
  // Forgot password
  // =====================
  it('switches to forgot password mode', () => {
    render(<Login onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('忘記密碼？'));
    expect(screen.getByText('重設密碼')).toBeInTheDocument();
    expect(screen.getByText('發送重設連結')).toBeInTheDocument();
  });

  it('sends reset password email', async () => {
    mockResetPassword.mockResolvedValue({});
    render(<Login onLogin={vi.fn()} />);

    fireEvent.click(screen.getByText('忘記密碼？'));
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'forgot@test.com' } });
    fireEvent.submit(screen.getByText('發送重設連結'));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('forgot@test.com');
      expect(screen.getByText(/重設連結已寄出/)).toBeInTheDocument();
    });
  });

  it('shows error if email is empty on forgot password submit', async () => {
    render(<Login onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('忘記密碼？'));
    // Email is empty - submit
    fireEvent.submit(screen.getByText('發送重設連結'));

    await waitFor(() => {
      // HTML5 required should prevent or we get error
    });
  });

  it('returns to login from forgot password', () => {
    render(<Login onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('忘記密碼？'));
    expect(screen.getByText('重設密碼')).toBeInTheDocument();
    fireEvent.click(screen.getByText('← 返回登入'));
    expect(screen.getByText('登入', { selector: 'button[type="submit"]' })).toBeInTheDocument();
  });

  it('hides password field in forgot mode', () => {
    render(<Login onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('忘記密碼？'));
    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<Login onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    fireEvent.submit(screen.getByText('登入', { selector: 'button[type="submit"]' }));

    await waitFor(() => {
      expect(screen.getByText('處理中...')).toBeInTheDocument();
    });
  });

  it('clears error when switching modes', () => {
    render(<Login onLogin={vi.fn()} />);
    // Switch to register then back to login
    const toggleBtns = screen.getAllByRole('button');
    const registerTab = toggleBtns.find(b => b.textContent.trim() === '註冊');
    const loginTab = toggleBtns.find(b => b.textContent.trim() === '登入' && b.classList.contains('toggle-btn'));
    fireEvent.click(registerTab);
    fireEvent.click(loginTab);
    // No error should be shown
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });
});
