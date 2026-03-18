// Rule-based alert engine
// Based on protocol: pain ≥ 8 for 3+ days, persistent bleeding, no bowel 3+ days, fever

export function checkAlerts(reports) {
  const alerts = [];
  if (!reports || reports.length === 0) return alerts;

  // Sort by date descending
  const sorted = [...reports].sort((a, b) => b.date.localeCompare(a.date));

  // 1. Pain ≥ 8 for 3+ consecutive days
  const recentReports = sorted.slice(0, 7);
  let consecutiveHighPain = 0;
  for (const r of recentReports) {
    if (r.pain >= 8) {
      consecutiveHighPain++;
    } else {
      break;
    }
  }
  if (consecutiveHighPain >= 3) {
    alerts.push({
      id: 'high_pain',
      type: 'danger',
      icon: '🔴',
      title: '持續性高度疼痛',
      message: `疼痛分數 ≥ 8 已連續 ${consecutiveHighPain} 天，建議聯絡醫療機構或回診評估。`,
    });
  }

  // 2. Persistent bleeding
  const latestReport = sorted[0];
  if (latestReport && latestReport.bleeding === '持續') {
    alerts.push({
      id: 'persistent_bleeding',
      type: 'danger',
      icon: '🩸',
      title: '持續性出血',
      message: '您回報了持續性出血，建議儘速聯絡醫療機構評估。',
    });
  }
  if (latestReport && latestReport.bleeding === '血塊') {
    alerts.push({
      id: 'blood_clot',
      type: 'danger',
      icon: '🩸',
      title: '出血伴隨血塊',
      message: '您回報了出血伴隨血塊，建議儘速聯絡醫療機構評估。',
    });
  }

  // 3. No bowel movement for 3+ days
  let consecutiveNoBowel = 0;
  for (const r of recentReports) {
    if (r.bowel === '未排') {
      consecutiveNoBowel++;
    } else {
      break;
    }
  }
  if (consecutiveNoBowel >= 3) {
    alerts.push({
      id: 'no_bowel',
      type: 'warning',
      icon: '⚠️',
      title: '超過3天未排便',
      message: `已連續 ${consecutiveNoBowel} 天未排便，建議聯絡醫療機構評估是否需要處置。`,
    });
  }

  // 4. Fever
  if (latestReport && latestReport.fever) {
    alerts.push({
      id: 'fever',
      type: 'danger',
      icon: '🌡️',
      title: '發燒',
      message: '您回報了發燒症狀，建議儘速聯絡醫療機構評估。',
    });
  }

  return alerts;
}

export function getAlertLevel(alerts) {
  if (alerts.some(a => a.type === 'danger')) return 'danger';
  if (alerts.some(a => a.type === 'warning')) return 'warning';
  return 'safe';
}
