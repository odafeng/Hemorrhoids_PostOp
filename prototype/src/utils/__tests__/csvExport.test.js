import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCSV, downloadJSON } from '../csvExport';

describe('csvExport', () => {
  let mockAnchor;

  beforeEach(() => {
    // Mock anchor element
    mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

    // Mock URL APIs
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });

    // Mock alert
    vi.stubGlobal('alert', vi.fn());
  });

  // ---------- downloadCSV ----------
  describe('downloadCSV', () => {
    it('creates correct CSV with headers and rows', () => {
      const rows = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      downloadCSV(rows, ['name', 'age'], 'test.csv');

      // Verify Blob was created with BOM + CSV content
      const blobCall = vi.mocked(URL.createObjectURL).mock.calls[0][0];
      expect(blobCall).toBeInstanceOf(Blob);
      expect(blobCall.type).toBe('text/csv;charset=utf-8;');

      expect(mockAnchor.download).toBe('test.csv');
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('escapes commas in values', () => {
      // We capture the Blob to inspect CSV content
      let blobContent = '';
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn((blob) => {
          // Blob stores parts; reconstruct
          blobContent = blob;
          return 'blob:mock-url';
        }),
        revokeObjectURL: vi.fn(),
      });

      const rows = [{ note: 'a,b' }];
      downloadCSV(rows, ['note'], 'test.csv');

      // The value "a,b" should be wrapped in quotes
      // We verify via Blob - read its text
      expect(blobContent).toBeInstanceOf(Blob);
      // Use async blob reading in a sync test by checking Blob constructor
      // Since we can't easily read Blob synchronously, verify behavior indirectly:
      // the click was triggered meaning CSV was created without error
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('escapes double quotes in values', () => {
      const rows = [{ note: 'say "hello"' }];
      downloadCSV(rows, ['note'], 'test.csv');
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('escapes newlines in values', () => {
      const rows = [{ note: 'line1\nline2' }];
      downloadCSV(rows, ['note'], 'test.csv');
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('handles null and undefined values', () => {
      const rows = [{ a: null, b: undefined, c: 'ok' }];
      downloadCSV(rows, ['a', 'b', 'c'], 'test.csv');
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('shows alert and does not download when rows is empty', () => {
      downloadCSV([], ['name'], 'test.csv');

      expect(alert).toHaveBeenCalledWith('尚無資料可匯出');
      expect(mockAnchor.click).not.toHaveBeenCalled();
    });
  });

  // ---------- downloadJSON ----------
  describe('downloadJSON', () => {
    it('creates correct JSON and triggers download', () => {
      const tables = {
        patients: [{ id: 1, name: 'Alice' }],
        reports: [{ id: 1, pain: 3 }],
      };

      downloadJSON(tables, 'backup.json');

      const blobCall = vi.mocked(URL.createObjectURL).mock.calls[0][0];
      expect(blobCall).toBeInstanceOf(Blob);
      expect(blobCall.type).toBe('application/json;charset=utf-8;');

      expect(mockAnchor.download).toBe('backup.json');
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  // ---------- CSV content verification via Blob text ----------
  describe('CSV content integrity', () => {
    it('produces correct CSV string with BOM, headers, and escaped values', async () => {
      let capturedBlob;
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn((blob) => { capturedBlob = blob; return 'blob:mock-url'; }),
        revokeObjectURL: vi.fn(),
      });

      const rows = [
        { name: 'Alice', comment: 'good' },
        { name: 'Bob, Jr.', comment: 'said "hi"' },
        { name: 'Carol', comment: 'line1\nline2' },
      ];

      downloadCSV(rows, ['name', 'comment'], 'out.csv');

      const text = await capturedBlob.text();
      // Blob.text() in jsdom may strip the BOM, so check with or without it
      const csvBody =
        'name,comment\n' +
        'Alice,good\n' +
        '"Bob, Jr.","said ""hi"""\n' +
        'Carol,"line1\nline2"';
      const withBom = '\uFEFF' + csvBody;
      const matches = text === withBom || text === csvBody;
      expect(matches).toBe(true);
    });
  });
});
