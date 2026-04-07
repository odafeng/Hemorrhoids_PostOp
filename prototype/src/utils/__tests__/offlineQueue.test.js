import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enqueueReport,
  getQueuedReports,
  removeFromQueue,
  getQueueCount,
  flushQueue,
} from '../offlineQueue';

// crypto.randomUUID is used inside enqueueReport
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-1') });

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    crypto.randomUUID.mockReset();
    crypto.randomUUID
      .mockReturnValueOnce('uuid-1')
      .mockReturnValueOnce('uuid-2')
      .mockReturnValueOnce('uuid-3');
  });

  // ---------- enqueueReport ----------
  describe('enqueueReport', () => {
    it('adds an item to the localStorage queue', () => {
      enqueueReport('S001', 2, { pain: 3 });

      const stored = JSON.parse(localStorage.getItem('offline_report_queue'));
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        studyId: 'S001',
        pod: 2,
        report: { pain: 3 },
        id: 'uuid-1',
      });
      expect(stored[0].queuedAt).toBeDefined();
    });

    it('accumulates multiple enqueues', () => {
      enqueueReport('S001', 1, { pain: 1 });
      enqueueReport('S002', 3, { pain: 5 });

      const stored = getQueuedReports();
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe('uuid-1');
      expect(stored[1].id).toBe('uuid-2');
    });
  });

  // ---------- getQueuedReports ----------
  describe('getQueuedReports', () => {
    it('returns empty array when nothing is stored', () => {
      expect(getQueuedReports()).toEqual([]);
    });

    it('returns the stored queue', () => {
      enqueueReport('S001', 0, { bleeding: false });
      const queue = getQueuedReports();
      expect(queue).toHaveLength(1);
      expect(queue[0].studyId).toBe('S001');
    });

    it('returns empty array when localStorage contains corrupt data', () => {
      localStorage.setItem('offline_report_queue', '<<<not json>>>');
      expect(getQueuedReports()).toEqual([]);
    });
  });

  // ---------- removeFromQueue ----------
  describe('removeFromQueue', () => {
    it('removes an item by id', () => {
      enqueueReport('S001', 1, { pain: 1 });
      enqueueReport('S002', 2, { pain: 2 });

      removeFromQueue('uuid-1');

      const queue = getQueuedReports();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('uuid-2');
    });

    it('does nothing when id does not exist', () => {
      enqueueReport('S001', 1, { pain: 1 });
      removeFromQueue('nonexistent');
      expect(getQueuedReports()).toHaveLength(1);
    });
  });

  // ---------- getQueueCount ----------
  describe('getQueueCount', () => {
    it('returns 0 for empty queue', () => {
      expect(getQueueCount()).toBe(0);
    });

    it('returns the number of queued items', () => {
      enqueueReport('S001', 1, {});
      enqueueReport('S002', 2, {});
      expect(getQueueCount()).toBe(2);
    });
  });

  // ---------- flushQueue ----------
  describe('flushQueue', () => {
    it('returns {flushed:0, failed:0} for empty queue', async () => {
      const result = await flushQueue(vi.fn());
      expect(result).toEqual({ flushed: 0, failed: 0 });
    });

    it('calls saveReportFn for each item and removes successful ones', async () => {
      enqueueReport('S001', 1, { pain: 1 });
      enqueueReport('S002', 2, { pain: 2 });

      const saveFn = vi.fn().mockResolvedValue(undefined);
      const result = await flushQueue(saveFn);

      expect(saveFn).toHaveBeenCalledTimes(2);
      expect(saveFn).toHaveBeenCalledWith('S001', 1, { pain: 1 });
      expect(saveFn).toHaveBeenCalledWith('S002', 2, { pain: 2 });
      expect(result).toEqual({ flushed: 2, failed: 0 });
      expect(getQueueCount()).toBe(0);
    });

    it('counts failed items and leaves them in the queue', async () => {
      enqueueReport('S001', 1, { pain: 1 });
      enqueueReport('S002', 2, { pain: 2 });
      enqueueReport('S003', 3, { pain: 3 });

      const saveFn = vi.fn()
        .mockResolvedValueOnce(undefined)   // S001 succeeds
        .mockRejectedValueOnce(new Error()) // S002 fails
        .mockResolvedValueOnce(undefined);  // S003 succeeds

      const result = await flushQueue(saveFn);

      expect(result).toEqual({ flushed: 2, failed: 1 });
      // Only the failed item remains
      const remaining = getQueuedReports();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].studyId).toBe('S002');
    });
  });
});
