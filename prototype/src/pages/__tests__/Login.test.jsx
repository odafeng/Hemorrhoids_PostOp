import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../Login';

// Mock supabaseService to avoid real network calls
vi.mock('../../utils/supabaseService', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

describe('Login Page', () => {
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

  it('switches to register mode and shows study ID field', () => {
    render(<Login onLogin={vi.fn()} />);
    const toggleBtns = screen.getAllByRole('button');
    const registerTab = toggleBtns.find(b => b.textContent.trim() === '註冊' && b.classList.contains('toggle-btn'));
    fireEvent.click(registerTab);
    expect(screen.getByPlaceholderText('例如：HEM-001')).toBeInTheDocument();
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
});
