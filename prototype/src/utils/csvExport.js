// CSV export utility — reusable for any table export
// BOM-prefixed UTF-8 for Excel compatibility

/**
 * Convert rows to CSV string and trigger download
 * @param {Object[]} rows - Array of objects
 * @param {string[]} headers - Column keys to include
 * @param {string} filename - Download filename
 */
export function downloadCSV(rows, headers, filename) {
  if (rows.length === 0) {
    alert('尚無資料可匯出');
    return;
  }

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const val = r[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export all tables as a single JSON file (full data backup)
 * @param {Object} tables - { tableName: rows[] }
 * @param {string} filename
 */
export function downloadJSON(tables, filename) {
  const json = JSON.stringify(tables, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
