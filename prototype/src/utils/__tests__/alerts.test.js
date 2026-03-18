import { describe, it, expect } from 'vitest';
import { checkAlerts, getAlertLevel } from '../alerts';

// Helper to create a report entry
const makeReport = (overrides = {}) => ({
  date: '2026-03-18',
  pain: 3,
  bleeding: '無',
  bowel: '正常',
  fever: false,
  wound: '無異常',
  ...overrides,
});

// Generate consecutive dates counting backwards from today
const makeConsecutiveDates = (n) => {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date('2026-03-18');
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

describe('checkAlerts', () => {
  it('returns empty array for no reports', () => {
    expect(checkAlerts([])).toEqual([]);
    expect(checkAlerts(null)).toEqual([]);
    expect(checkAlerts(undefined)).toEqual([]);
  });

  it('returns empty array when all symptoms are normal', () => {
    const dates = makeConsecutiveDates(5);
    const reports = dates.map(date => makeReport({ date }));
    expect(checkAlerts(reports)).toEqual([]);
  });

  // === Pain Alerts ===
  describe('pain alerts', () => {
    it('triggers high pain alert for 3+ consecutive days with pain >= 8', () => {
      const dates = makeConsecutiveDates(4);
      const reports = dates.map(date => makeReport({ date, pain: 9 }));
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'high_pain')).toBe(true);
      expect(alerts.find(a => a.id === 'high_pain').type).toBe('danger');
    });

    it('does NOT trigger for only 2 consecutive days with pain >= 8', () => {
      const dates = makeConsecutiveDates(3);
      const reports = [
        makeReport({ date: dates[0], pain: 9 }),
        makeReport({ date: dates[1], pain: 8 }),
        makeReport({ date: dates[2], pain: 5 }), // breaks the streak
      ];
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'high_pain')).toBe(false);
    });

    it('does NOT trigger when pain is exactly 7 (below threshold)', () => {
      const dates = makeConsecutiveDates(5);
      const reports = dates.map(date => makeReport({ date, pain: 7 }));
      expect(checkAlerts(reports).some(a => a.id === 'high_pain')).toBe(false);
    });
  });

  // === Bleeding Alerts ===
  describe('bleeding alerts', () => {
    it('triggers persistent bleeding alert for latest report "持續"', () => {
      const reports = [makeReport({ date: '2026-03-18', bleeding: '持續' })];
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'persistent_bleeding')).toBe(true);
    });

    it('triggers blood clot alert for latest report "血塊"', () => {
      const reports = [makeReport({ date: '2026-03-18', bleeding: '血塊' })];
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'blood_clot')).toBe(true);
    });

    it('does NOT trigger for "少量" bleeding', () => {
      const reports = [makeReport({ date: '2026-03-18', bleeding: '少量' })];
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'persistent_bleeding')).toBe(false);
      expect(alerts.some(a => a.id === 'blood_clot')).toBe(false);
    });
  });

  // === Bowel Alerts ===
  describe('bowel alerts', () => {
    it('triggers no-bowel alert for 3+ consecutive days with "未排"', () => {
      const dates = makeConsecutiveDates(3);
      const reports = dates.map(date => makeReport({ date, bowel: '未排' }));
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'no_bowel')).toBe(true);
      expect(alerts.find(a => a.id === 'no_bowel').type).toBe('warning');
    });

    it('does NOT trigger for only 2 days of "未排"', () => {
      const dates = makeConsecutiveDates(3);
      const reports = [
        makeReport({ date: dates[0], bowel: '未排' }),
        makeReport({ date: dates[1], bowel: '未排' }),
        makeReport({ date: dates[2], bowel: '正常' }),
      ];
      expect(checkAlerts(reports).some(a => a.id === 'no_bowel')).toBe(false);
    });
  });

  // === Fever Alerts ===
  describe('fever alerts', () => {
    it('triggers fever alert when latest report has fever', () => {
      const reports = [makeReport({ date: '2026-03-18', fever: true })];
      const alerts = checkAlerts(reports);
      expect(alerts.some(a => a.id === 'fever')).toBe(true);
      expect(alerts.find(a => a.id === 'fever').type).toBe('danger');
    });

    it('does NOT trigger fever alert when no fever', () => {
      const reports = [makeReport({ date: '2026-03-18', fever: false })];
      expect(checkAlerts(reports).some(a => a.id === 'fever')).toBe(false);
    });
  });

  // === Multiple Alerts ===
  it('can trigger multiple alerts simultaneously', () => {
    const dates = makeConsecutiveDates(3);
    const reports = dates.map(date =>
      makeReport({ date, pain: 10, bleeding: '血塊', bowel: '未排', fever: true })
    );
    const alerts = checkAlerts(reports);
    expect(alerts.length).toBeGreaterThanOrEqual(4);
    expect(alerts.some(a => a.id === 'high_pain')).toBe(true);
    expect(alerts.some(a => a.id === 'blood_clot')).toBe(true);
    expect(alerts.some(a => a.id === 'no_bowel')).toBe(true);
    expect(alerts.some(a => a.id === 'fever')).toBe(true);
  });
});

describe('getAlertLevel', () => {
  it('returns "danger" when any alert is danger type', () => {
    const alerts = [{ type: 'warning' }, { type: 'danger' }];
    expect(getAlertLevel(alerts)).toBe('danger');
  });

  it('returns "warning" when highest is warning', () => {
    const alerts = [{ type: 'warning' }];
    expect(getAlertLevel(alerts)).toBe('warning');
  });

  it('returns "safe" when no alerts', () => {
    expect(getAlertLevel([])).toBe('safe');
  });
});
