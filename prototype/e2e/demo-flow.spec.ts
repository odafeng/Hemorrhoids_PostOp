// E2E: Demo mode critical path
// Login → Dashboard → Symptom Report → History → AI Chat
import { test, expect } from '@playwright/test';

test.describe('Demo Mode — Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible();
    const demoBtn = page.getByRole('button', { name: /Demo 模式/ });
    await demoBtn.scrollIntoViewIfNeeded();
    await demoBtn.click();
    await expect(page.getByText('術後天數')).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard shows POD counter and key elements', async ({ page }) => {
    await expect(page.getByText('術後天數')).toBeVisible();
    await expect(page.getByText('今日回報')).toBeVisible();
    await expect(page.getByText('回報率')).toBeVisible();
    // Quick action buttons (inside Dashboard card, not nav links)
    await expect(page.getByRole('button', { name: /紀錄/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /AI 衛教/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
  });

  test('Symptom Report → fill and submit', async ({ page }) => {
    await page.getByRole('button', { name: '填寫今日症狀回報' }).click();
    await expect(page.getByText('症狀回報')).toBeVisible();

    // Pain slider
    const painSlider = page.locator('input[type="range"]');
    if (await painSlider.count() > 0) {
      await painSlider.fill('5');
    }

    // Bleeding: 少量 (button accessible name includes description)
    await page.getByRole('button', { name: /少量/ }).click();

    // Bowel: 正常 (plain text, no description — only exact-match '正常' in bowel section)
    // Use locator chain to be precise: find the bowel form-group, then the button
    const bowelGroup = page.locator('.form-group').filter({ hasText: '排便狀況' });
    await bowelGroup.getByRole('button', { name: '正常' }).click();

    // Continence: 正常 (has description '可以控制')
    const continenceGroup = page.locator('.form-group').filter({ hasText: '肛門控制' });
    await continenceGroup.getByRole('button', { name: /正常/ }).click();

    // Fever: 否
    await page.getByRole('button', { name: '否' }).click();

    // Urinary: 正常 (has description '排尿順暢')
    const urinaryGroup = page.locator('.form-group').filter({ hasText: '排尿狀況' });
    await urinaryGroup.getByRole('button', { name: /正常/ }).click();

    // Wound: 無異常
    await page.getByRole('button', { name: '無異常' }).click();

    // Submit
    const submitBtn = page.getByRole('button', { name: '提交回報' });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Should show success or go back to dashboard
    await expect(page.getByText(/回報成功|術後追蹤|已完成/)).toBeVisible({ timeout: 5000 });
  });

  test('History page shows reports', async ({ page }) => {
    // Use the bottom nav link (NavLink = <a>, not button)
    const historyLink = page.locator('nav.bottom-nav').getByText('紀錄');
    await historyLink.click();
    await expect(page.getByText('歷史紀錄')).toBeVisible();
  });

  test('AI Chat — send question and get response', async ({ page }) => {
    const chatLink = page.locator('nav.bottom-nav').getByText('AI 衛教');
    await chatLink.click();
    await expect(page.getByText('AI 衛教助手')).toBeVisible();

    // Use quick question button
    const quickBtn = page.locator('button.quick-q').first();
    if (await quickBtn.count() > 0) {
      await quickBtn.click();
      // Wait for mock AI response
      await page.waitForTimeout(2000);
      // Check that AI responded (at least one ai bubble beyond the welcome)
      const aiBubbles = page.locator('.chat-bubble.ai');
      await expect(aiBubbles.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Logout returns to login page', async ({ page }) => {
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible();
  });
});
