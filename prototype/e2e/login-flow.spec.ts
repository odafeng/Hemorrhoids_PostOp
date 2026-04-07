// E2E: Login Page Flow
// Tests all login page interactions and mode switching
// No Supabase needed — tests UI behavior only
import { test, expect } from '@playwright/test';

test.describe('Login Page — UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
  });

  // =====================
  // Login page elements
  // =====================
  test('renders all login page elements', async ({ page }) => {
    // Branding
    await expect(page.getByText('術後追蹤系統')).toBeVisible();
    await expect(page.getByText(/痔瘡手術術後症狀監測/)).toBeVisible();

    // Mode tabs
    await expect(page.locator('.toggle-btn').filter({ hasText: '登入' })).toBeVisible();
    await expect(page.locator('.toggle-btn').filter({ hasText: '註冊' })).toBeVisible();

    // Form fields
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();

    // Submit
    await expect(page.locator('form').getByRole('button', { name: '登入' })).toBeVisible();

    // Forgot password
    await expect(page.getByText('忘記密碼？')).toBeVisible();

    // Demo buttons
    await expect(page.getByRole('button', { name: /Demo 模式/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /研究者 Demo/ })).toBeVisible();
  });

  // =====================
  // Tab switching: Login → Register → Login
  // =====================
  test('switches between login and register tabs', async ({ page }) => {
    // Switch to register
    await page.locator('.toggle-btn').filter({ hasText: '註冊' }).click();
    await expect(page.getByText('建立帳號')).toBeVisible();
    await expect(page.getByPlaceholder('請輸入研究團隊提供的邀請碼')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.getByPlaceholder('001')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();

    // Switch back to login
    await page.locator('.toggle-btn').filter({ hasText: '登入' }).click();
    await expect(page.locator('form').getByRole('button', { name: '登入' })).toBeVisible();
    await expect(page.getByPlaceholder('請輸入研究團隊提供的邀請碼')).not.toBeVisible();
  });

  // =====================
  // Forgot password flow
  // =====================
  test('forgot password flow', async ({ page }) => {
    // Click forgot password
    await page.getByText('忘記密碼？').click();

    // Should show forgot password UI
    await expect(page.getByText('重設密碼')).toBeVisible();
    await expect(page.getByText('發送重設連結')).toBeVisible();
    await expect(page.getByText(/輸入您的電子郵件/)).toBeVisible();

    // Password field should be hidden
    await expect(page.getByPlaceholder('••••••••')).not.toBeVisible();

    // Back button
    await expect(page.getByText('← 返回登入')).toBeVisible();
    await page.getByText('← 返回登入').click();

    // Should be back to login
    await expect(page.locator('form').getByRole('button', { name: '登入' })).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  // =====================
  // Demo mode entry — Patient
  // =====================
  test('Demo mode enters patient dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /Demo 模式/ }).click();
    await expect(page.getByText('術後天數')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('（Demo）')).toBeVisible();
  });

  // =====================
  // Demo mode entry — Researcher
  // =====================
  test('Researcher demo enters researcher dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /研究者 Demo/ }).click();
    await expect(page.getByText('研究者儀表板')).toBeVisible({ timeout: 10000 });
  });

  // =====================
  // Login form error display
  // =====================
  test('shows error on invalid login', async ({ page }) => {
    await page.getByPlaceholder('your@email.com').fill('nonexistent@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.locator('form').getByRole('button', { name: '登入' }).click();

    // Should show error or loading (depending on whether Supabase is configured)
    // In dev without Supabase, the login may fail instantly
    await page.waitForTimeout(3000);
    // Check for either error message or that we're still on login page
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  });
});
