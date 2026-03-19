// E2E: Auth mode — real Supabase login
// Requires env vars: E2E_EMAIL, E2E_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';

// Skip entire suite if credentials not provided (e.g. local dev without secrets)
test.describe('Auth Mode — Real Login', () => {
  test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set — skipping auth tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });

    // Fill login form
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: '登入' }).click();

    // Wait for dashboard to load (auth + data fetch)
    await expect(page.getByText('術後天數')).toBeVisible({ timeout: 15000 });
  });

  test('Dashboard loads with real patient data', async ({ page }) => {
    await expect(page.getByText('術後天數')).toBeVisible();
    await expect(page.getByText('今日回報')).toBeVisible();
    await expect(page.getByText('回報率')).toBeVisible();
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
  });

  test('History page loads', async ({ page }) => {
    const historyLink = page.locator('nav.bottom-nav').getByText('紀錄');
    await historyLink.click();
    await expect(page.getByText('歷史紀錄')).toBeVisible({ timeout: 10000 });
  });

  test('AI Chat page loads and shows welcome', async ({ page }) => {
    const chatLink = page.locator('nav.bottom-nav').getByText('AI 衛教');
    await chatLink.click();
    await expect(page.getByText('AI 衛教助手')).toBeVisible({ timeout: 10000 });
    // Welcome message should exist
    await expect(page.locator('.chat-bubble.ai').first()).toBeVisible();
  });

  test('Symptom Report page loads and shows form', async ({ page }) => {
    const reportLink = page.locator('nav.bottom-nav').getByText('回報');
    await reportLink.click();
    // Either the form title or loading spinner should appear
    await expect(page.getByText(/症狀回報|載入中/)).toBeVisible({ timeout: 10000 });
    // Wait for form to be ready
    await expect(page.getByText('疼痛分數')).toBeVisible({ timeout: 10000 });
    // Verify form fields exist
    await expect(page.locator('input[type="range"]')).toBeVisible();
    // Do NOT submit — avoid creating test data in production DB
  });

  test('Logout works', async ({ page }) => {
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
  });
});
