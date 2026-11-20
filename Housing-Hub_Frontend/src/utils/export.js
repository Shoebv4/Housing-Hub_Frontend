const escapeCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const downloadCsv = (filename, headers, rows) => {
  const lines = [headers, ...rows]
    .map(row => row.map(escapeCsv).join(','))
    .join('\r\n');

  const blob = new Blob([`﻿${lines}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
