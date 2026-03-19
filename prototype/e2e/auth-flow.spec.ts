// E2E: Auth mode — real Supabase login, tests report submit + AI chat
// Requires GitHub Secrets: E2E_EMAIL, E2E_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';

test.describe('Auth Mode — Report & AI Chat', () => {
  test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
    });

    await page.goto('/');
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.locator('form').getByRole('button', { name: '登入' }).click();

    // Wait for either: dashboard loads, OR login error appears, OR loading screen
    const dashboard = page.getByText('術後天數');
    const loginError = page.locator('.alert-banner');
    const loadingScreen = page.getByText('載入中');

    // First: make sure we left the login page (form should disappear)
    await expect(page.getByPlaceholder('your@email.com')).not.toBeVisible({ timeout: 20000 }).catch(async () => {
      // Still on login page — probably login failed
      const bodyText = await page.locator('body').innerText();
      throw new Error(`Login failed — still on login page. Page text: ${bodyText.slice(0, 500)}`);
    });

    // Then wait for dashboard
    await expect(dashboard).toBeVisible({ timeout: 20000 });
  });

  test('Submit symptom report (full form)', async ({ page }) => {
    // Navigate to report
    await page.locator('nav.bottom-nav').getByText('回報').click();
    await expect(page.getByText('疼痛分數')).toBeVisible({ timeout: 10000 });

    // Pain slider
    const slider = page.locator('input[type="range"]');
    await slider.fill('4');

    // Bleeding — scope to 出血程度 section
    const bleedingGroup = page.locator('.form-group').filter({ hasText: '出血程度' });
    await bleedingGroup.getByRole('button', { name: /少量/ }).click();

    // Bowel — scope to 排便狀況
    const bowelGroup = page.locator('.form-group').filter({ hasText: '排便狀況' });
    await bowelGroup.getByRole('button', { name: '正常' }).click();

    // Continence — scope to 肛門控制
    const continenceGroup = page.locator('.form-group').filter({ hasText: '肛門控制' });
    await continenceGroup.getByRole('button', { name: /正常/ }).click();

    // Fever
    await page.getByRole('button', { name: '否' }).click();

    // Urinary — scope to 排尿狀況
    const urinaryGroup = page.locator('.form-group').filter({ hasText: '排尿狀況' });
    await urinaryGroup.getByRole('button', { name: /正常/ }).click();

    // Wound — toggle behavior, need to ensure it's selected not deselected
    const woundBtn = page.getByRole('button', { name: '無異常' });
    const isWoundSelected = await woundBtn.evaluate(el => el.classList.contains('selected'));
    if (!isWoundSelected) await woundBtn.click();

    // Verify submit button is enabled before clicking
    const submitBtn = page.getByRole('button', { name: '提交回報' });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Verify success
    await expect(page.getByText('回報成功')).toBeVisible({ timeout: 10000 });

    // Should return to dashboard
    await expect(page.getByText('術後天數')).toBeVisible({ timeout: 10000 });

    // Dashboard should show today's report as completed
    await expect(page.getByText('✓ 已完成')).toBeVisible();
  });

  test('History shows submitted report data', async ({ page }) => {
    // Navigate to history
    await page.locator('nav.bottom-nav').getByText('紀錄').click();
    await expect(page.getByText('歷史紀錄')).toBeVisible({ timeout: 10000 });

    // Should show at least 1 report
    await expect(page.getByText(/已完成 \d+ 次回報/)).toBeVisible();

    // Today's report should be in the timeline
    const today = new Date().toLocaleDateString('en-CA');
    await expect(page.getByText(today)).toBeVisible();

    // Verify symptom values from the submitted report are displayed
    // Pain chart should exist if 2+ reports
    const timeline = page.locator('.timeline');
    await expect(timeline).toBeVisible();

    // The latest timeline item should show symptom data
    const latestItem = page.locator('.timeline-item').first();
    await expect(latestItem.getByText(/\/10/)).toBeVisible(); // pain score
    await expect(latestItem.getByText('出血')).toBeVisible();
    await expect(latestItem.getByText('排便')).toBeVisible();
    await expect(latestItem.getByText('發燒')).toBeVisible();
    await expect(latestItem.getByText('傷口')).toBeVisible();
  });

  test('AI Chat — ask question and get Claude response', async ({ page }) => {
    // Navigate to chat
    await page.locator('nav.bottom-nav').getByText('AI 衛教').click();
    await expect(page.locator('.chat-bubble.ai').first()).toBeVisible({ timeout: 10000 });

    // Use quick question
    const quickBtn = page.locator('button.quick-q').first();
    await quickBtn.click();

    // Wait for AI response (real Claude API via Edge Function)
    // The typing indicator shows first, then the response
    await expect(page.locator('.chat-bubble.ai').nth(1)).toBeVisible({ timeout: 30000 });

    // Verify the response is from Claude (not mock/error)
    const secondBubble = page.locator('.chat-bubble.ai').nth(1);
    await expect(secondBubble.locator('.bubble-label')).toContainText('AI 衛教助手');

    // Verify disclaimer footer exists
    await expect(secondBubble.getByText('僅供衛教參考')).toBeVisible();
  });

  test('Logout works', async ({ page }) => {
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page.getByText('術後追蹤系統')).toBeVisible({ timeout: 10000 });
  });
});
