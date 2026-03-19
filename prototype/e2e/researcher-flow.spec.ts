// E2E: Researcher mode — real Supabase login
// Requires GitHub Secrets: E2E_RESEARCHER_EMAIL, E2E_RESEARCHER_PASSWORD
import { test, expect } from '@playwright/test';

const email = process.env.E2E_RESEARCHER_EMAIL || '';
const password = process.env.E2E_RESEARCHER_PASSWORD || '';

test.describe('Researcher — Dashboard & Tools', () => {
  test.skip(!email || !password, 'E2E_RESEARCHER_EMAIL / E2E_RESEARCHER_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
    });

    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.locator('form').getByRole('button', { name: '登入' }).click();

    // Researcher should land on researcher dashboard (not patient dashboard)
    await expect(page.getByText('研究者儀表板')).toBeVisible({ timeout: 20000 });
  });

  test('Dashboard shows stats, patient table, and alerts', async ({ page }) => {
    // Stats grid
    await expect(page.getByText('收案人數')).toBeVisible();
    await expect(page.getByText('平均依從率')).toBeVisible();
    await expect(page.getByText('活躍警示')).toBeVisible();
    await expect(page.getByText('待審核 AI')).toBeVisible();

    // Patient table
    await expect(page.getByText('病人列表')).toBeVisible();
    await expect(page.getByText('Study ID')).toBeVisible();

    // CSV export button
    await expect(page.getByRole('button', { name: /匯出症狀回報/ })).toBeVisible();

    // Logout button
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
  });

  test('Patient lookup — search by study ID', async ({ page }) => {
    // Navigate to lookup
    await page.locator('nav.bottom-nav').getByText('查詢').click();
    await expect(page.getByText('病人查詢')).toBeVisible({ timeout: 10000 });

    // Search for the test patient
    await page.getByPlaceholder(/Study ID/).fill('TEST-002');
    await page.getByRole('button', { name: '查詢' }).click();

    // Should show patient info
    await expect(page.getByText('TEST-002')).toBeVisible({ timeout: 10000 });
    // Should show patient info or not found
    await expect(page.getByText(/Surgery date|NOT FOUND/)).toBeVisible({ timeout: 10000 });
  });

  test('Chat review page loads and shows review UI', async ({ page }) => {
    // Navigate to review
    await page.locator('nav.bottom-nav').getByText('審核').click();
    await expect(page.getByText('AI 回覆審核')).toBeVisible({ timeout: 10000 });

    // Should show either unreviewed chats or "all reviewed" message
    await expect(page.getByText(/待審核|所有 AI 回覆皆已審核完畢/)).toBeVisible();

    // If there are unreviewed chats, batch button should be visible
    const batchBtn = page.getByRole('button', { name: /批次審核全部/ });
    const allReviewed = page.getByText('所有 AI 回覆皆已審核完畢');

    // One of these should be visible
    await expect(batchBtn.or(allReviewed)).toBeVisible();
  });

  test('Logout works', async ({ page }) => {
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
  });
});
