// Offline queue for symptom reports
// Stores failed submissions in localStorage and retries when back online

const QUEUE_KEY = 'offline_report_queue';

export function enqueueReport(studyId, pod, report) {
  const queue = getQueuedReports();
  queue.push({
    studyId,
    pod,
    report,
    queuedAt: new Date().toISOString(),
    id: crypto.randomUUID(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueuedReports() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeFromQueue(id) {
  const queue = getQueuedReports().filter(r => r.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueueCount() {
  return getQueuedReports().length;
}

/**
 * Flush all queued reports — call when back online
 * @param {Function} saveReportFn - (studyId, pod, report) => Promise
 * @returns {{ flushed: number, failed: number }}
 */
export async function flushQueue(saveReportFn) {
  const queue = getQueuedReports();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await saveReportFn(item.studyId, item.pod, item.report);
      removeFromQueue(item.id);
      flushed++;
    } catch {
      failed++;
    }
  }

  return { flushed, failed };
}
