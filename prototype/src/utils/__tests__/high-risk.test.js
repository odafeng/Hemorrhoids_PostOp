// High-risk flow tests: auth, alerts edge cases, error handling
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseClient before imports  
vi.mock('../supabaseClient', () => ({
  default: null,
  supabase: null,
}));

describe('claudeService — auth enforcement', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return safe fallback (mock or error) without auth session', async () => {
    // Without session: returns 'mock' (no URL) or 'error' (URL but no session)
    // Both are safe — the key is it never returns 'claude' without auth
    const { getClaudeResponse } = await import('../claudeService');
    const result = await getClaudeResponse('test question');
    expect(['mock', 'error']).toContain(result.source);
    expect(result.text).toBeTruthy();
  });

  it('should use mock in demo mode', async () => {
    const { getClaudeResponse } = await import('../claudeService');
    const result = await getClaudeResponse('痛', { isDemo: true });
    expect(result.source).toBe('mock');
    expect(result.text).toBeTruthy();
  });
});

describe('alerts edge cases — matching actual alerts.js API', () => {
  let checkAlerts;
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../alerts');
    checkAlerts = mod.checkAlerts;
  });

  // Rule 1: high_pain requires 3+ consecutive days of pain ≥ 8
  it('should trigger high_pain for 3 consecutive days of pain ≥ 8', () => {
    const reports = [
      { date: '2026-01-03', pain: 8, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
      { date: '2026-01-02', pain: 9, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
      { date: '2026-01-01', pain: 8, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'high_pain')).toBe(true);
  });

  it('should NOT trigger high_pain for only 2 consecutive days of pain ≥ 8', () => {
    const reports = [
      { date: '2026-01-02', pain: 8, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
      { date: '2026-01-01', pain: 9, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'high_pain')).toBe(false);
  });

  // Rule 2: persistent_bleeding requires 2+ consecutive '持續' bleeding
  it('should trigger persistent_bleeding for 2 consecutive 持續 bleeding', () => {
    const reports = [
      { date: '2026-01-02', pain: 3, bleeding: '持續', bowel: '正常', fever: false, wound: '無異常' },
      { date: '2026-01-01', pain: 3, bleeding: '持續', bowel: '正常', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'persistent_bleeding')).toBe(true);
  });

  it('should NOT trigger persistent_bleeding for non-consecutive bleeding', () => {
    const reports = [
      { date: '2026-01-03', pain: 3, bleeding: '持續', bowel: '正常', fever: false, wound: '無異常' },
      { date: '2026-01-02', pain: 3, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
      { date: '2026-01-01', pain: 3, bleeding: '持續', bowel: '正常', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'persistent_bleeding')).toBe(false);
  });

  // Rule: blood_clot — single 血塊 report
  it('should trigger blood_clot when latest bleeding is 血塊', () => {
    const reports = [
      { date: '2026-01-01', pain: 3, bleeding: '血塊', bowel: '正常', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'blood_clot')).toBe(true);
  });

  // Rule: no_bowel — 3+ consecutive 未排
  it('should trigger no_bowel for 3 consecutive days of 未排', () => {
    const reports = [
      { date: '2026-01-03', pain: 3, bleeding: '無', bowel: '未排', fever: false, wound: '無異常' },
      { date: '2026-01-02', pain: 3, bleeding: '無', bowel: '未排', fever: false, wound: '無異常' },
      { date: '2026-01-01', pain: 3, bleeding: '無', bowel: '未排', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'no_bowel')).toBe(true);
  });

  // Rule: fever
  it('should trigger fever when fever is true', () => {
    const reports = [
      { date: '2026-01-01', pain: 3, bleeding: '無', bowel: '正常', fever: true, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts.some(a => a.id === 'fever')).toBe(true);
  });

  it('should NOT trigger any alert for completely normal report', () => {
    const reports = [
      { date: '2026-01-01', pain: 3, bleeding: '無', bowel: '正常', fever: false, wound: '無異常' },
    ];
    const alerts = checkAlerts(reports);
    expect(alerts).toHaveLength(0);
  });
});

describe('errorLogger resilience', () => {
  it('should not throw even when Supabase is unavailable', async () => {
    const { logError, Severity } = await import('../errorLogger');
    await expect(
      logError(new Error('test'), { type: 'test', severity: Severity.WARNING })
    ).resolves.not.toThrow();
  });
});
