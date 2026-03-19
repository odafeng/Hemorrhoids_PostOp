// E2E: Demo mode — quick smoke test (no Supabase needed)
import { test, expect } from '@playwright/test';

test.describe('Demo Mode — Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Demo 模式/ }).click();
    await expect(page.getByText('術後天數')).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard → pages load → logout', async ({ page }) => {
    // Dashboard
    await expect(page.getByText('今日回報')).toBeVisible();
    await expect(page.getByText('回報率')).toBeVisible();

    // History
    await page.locator('nav.bottom-nav').getByText('紀錄').click();
    await expect(page.getByText('歷史紀錄')).toBeVisible();

    // AI Chat
    await page.locator('nav.bottom-nav').getByText('AI 衛教').click();
    await expect(page.locator('.chat-bubble.ai').first()).toBeVisible();

    // Logout
    await page.locator('nav.bottom-nav').getByText('首頁').click();
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible();
  });
});
