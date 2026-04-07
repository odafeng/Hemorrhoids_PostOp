// E2E: Demo mode — quick smoke test (no Supabase needed)
import { test, expect } from '@playwright/test';

test.describe('Demo Mode — Patient Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Demo 模式/ }).click();
    await expect(page.getByText('術後天數')).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard → pages load → logout', async ({ page }) => {
    await expect(page.getByText('今日回報')).toBeVisible();
    await expect(page.getByText('回報率')).toBeVisible();

    await page.locator('nav.bottom-nav').getByText('紀錄').click();
    await expect(page.getByText('歷史紀錄')).toBeVisible();

    await page.locator('nav.bottom-nav').getByText('AI 衛教').click();
    await expect(page.locator('.chat-bubble.ai').first()).toBeVisible();

    await page.locator('nav.bottom-nav').getByText('首頁').click();
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible();
  });
});

test.describe('Demo Mode — Researcher Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /研究者 Demo/ }).click();
    await expect(page.getByText('研究者儀表板')).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard shows stats and patient table', async ({ page }) => {
    await expect(page.getByText('收案人數')).toBeVisible();
    await expect(page.getByText('平均依從率')).toBeVisible();
    await expect(page.getByText('活躍警示')).toBeVisible();
    await expect(page.getByText('病人列表')).toBeVisible();
    await expect(page.getByText('Study ID')).toBeVisible();
  });

  test('Patient lookup page loads', async ({ page }) => {
    await page.locator('nav.bottom-nav').getByText('查詢').click();
    await expect(page.getByText('病人查詢')).toBeVisible();
    await expect(page.getByPlaceholder(/Study ID/)).toBeVisible();
  });

  test('Chat review page loads', async ({ page }) => {
    await page.locator('nav.bottom-nav').getByText('審核').click();
    await expect(page.getByText('AI 回覆審核')).toBeVisible();
  });

  test('Export buttons exist', async ({ page }) => {
    await expect(page.getByRole('button', { name: /症狀回報 CSV/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /警示紀錄 CSV/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /AI 對話紀錄 CSV/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /全量資料備份/ })).toBeVisible();
  });

  test('Logout works', async ({ page }) => {
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible();
  });
});
